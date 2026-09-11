import { randomUUID } from "node:crypto";
import { quotePhotoToVideo, requestFingerprint } from "./quote.js";
import {
  AgentError,
  type CreateRequest,
  type CreditsSnapshot,
  type GenerationRecord,
  type QuoteRequest,
  type QuoteResult,
} from "./types.js";

type Stored = GenerationRecord & { fingerprint: string };

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_QUEUE_CAP = 8;

export class MockAgentBackend {
  credits = 1000;
  plan = "starter";
  concurrency = DEFAULT_CONCURRENCY;
  private readonly byId = new Map<string, Stored>();
  private readonly byClient = new Map<string, string>();

  listCredits(): CreditsSnapshot {
    return { credits: this.credits, plan: this.plan, concurrency: this.concurrency };
  }

  quote(input: QuoteRequest): QuoteResult {
    return quotePhotoToVideo(input);
  }

  create(input: CreateRequest): GenerationRecord {
    if (!input.clientRequestId) {
      throw new AgentError("invalid_input", "clientRequestId is required so retries do not start a second video.");
    }

    const quote = quotePhotoToVideo(input);
    if (input.confirmedCredits !== quote.quotedCredits) {
      throw new AgentError("quote_changed", "confirmedCredits does not match the current photo-to-video quote.", {
        quotedCredits: quote.quotedCredits,
        confirmedCredits: input.confirmedCredits,
      });
    }

    const fingerprint = requestFingerprint({
      capabilityId: quote.capabilityId,
      prompt: quote.normalized.prompt,
      values: quote.normalized.values,
      assetIds: quote.normalized.assetIds,
    });

    const existingId = this.byClient.get(input.clientRequestId);
    if (existingId) {
      const existing = this.byId.get(existingId);
      if (!existing) {
        throw new AgentError("submission_unknown", "This clientRequestId was seen but the generation is not readable. Poll, do not create again.");
      }
      if (existing.fingerprint !== fingerprint) {
        throw new AgentError(
          "idempotency_conflict",
          "clientRequestId was already used with different photo-to-video input. Quote again with a new id."
        );
      }
      return this.publicRecord(existing);
    }

    const inFlight = [...this.byId.values()].filter((item) =>
      ["queued", "waiting_slot", "running"].includes(item.status)
    ).length;
    if (inFlight >= DEFAULT_QUEUE_CAP) {
      throw new AgentError("queue_full", "Too many photo-to-video jobs are already waiting on this account.");
    }
    if (inFlight >= this.concurrency) {
      throw new AgentError(
        "parallel_limit_reached",
        `This account can run ${this.concurrency} photo-to-video jobs at once. Poll generation_get until one finishes.`
      );
    }

    if (this.credits < quote.quotedCredits) {
      throw new AgentError("insufficient_credits", "Not enough credits to make video from this photo.", {
        requiredCredits: quote.quotedCredits,
        currentCredits: this.credits,
      });
    }

    this.credits -= quote.quotedCredits;
    const generationId = `gen_${randomUUID()}`;
    const record: Stored = {
      generationId,
      clientRequestId: input.clientRequestId,
      status: "running",
      quotedCredits: quote.quotedCredits,
      capabilityId: quote.capabilityId,
      prompt: quote.normalized.prompt,
      values: quote.normalized.values,
      assetIds: quote.normalized.assetIds,
      createdAt: new Date().toISOString(),
      fingerprint,
    };
    this.byId.set(generationId, record);
    this.byClient.set(input.clientRequestId, generationId);

    setTimeout(() => {
      const current = this.byId.get(generationId);
      if (!current || current.status !== "running") return;
      current.status = "succeeded";
      current.videoUrl = `https://cloud.picmovi.com/mock/${generationId}.mp4`;
      current.thumbnailUrl = current.assetIds.images?.[0];
    }, 50);

    return this.publicRecord(record);
  }

  get(generationId: string): GenerationRecord {
    const record = this.byId.get(generationId);
    if (!record) {
      throw new AgentError("generation_not_found", `No owned photo-to-video job ${generationId}.`);
    }
    return this.publicRecord(record);
  }

  private publicRecord(record: Stored): GenerationRecord {
    const { fingerprint: _fingerprint, ...pub } = record;
    return pub;
  }
}
