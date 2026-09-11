import assert from "node:assert/strict";
import test from "node:test";
import { quotePhotoToVideo } from "./quote.js";
import { AgentError } from "./types.js";
import { MockAgentBackend } from "./mock.js";

test("quotes seedance 2.5 photo to video at 480p 5s", () => {
  const quote = quotePhotoToVideo({
    capabilityId: "photo-to-video.seedance25",
    prompt: "gentle wind in hair, natural blink",
    values: { resolution: "480p", duration: "5s" },
    assetIds: { images: ["asset_start"] },
  });
  assert.equal(quote.quotedCredits, 155);
  assert.equal(quote.pricingKey, "seedance25_480p5s");
});

test("requires a start photo", () => {
  assert.throws(
    () => quotePhotoToVideo({ capabilityId: "photo-to-video.kling25turbo" }),
    (err: unknown) => err instanceof AgentError && err.code === "invalid_input"
  );
});

test("mock create is idempotent and rejects a second parallel job past the limit", () => {
  const backend = new MockAgentBackend();
  backend.concurrency = 1;
  const body = {
    capabilityId: "photo-to-video.kling25turbo",
    prompt: "subtle motion",
    values: { duration: "5s" },
    assetIds: { images: ["photo_1"] },
    confirmedCredits: 50,
    clientRequestId: "req_1",
  };
  const first = backend.create(body);
  const replay = backend.create(body);
  assert.equal(first.generationId, replay.generationId);
  assert.equal(backend.credits, 950);

  assert.throws(
    () =>
      backend.create({
        ...body,
        clientRequestId: "req_2",
      }),
    (err: unknown) => err instanceof AgentError && err.code === "parallel_limit_reached"
  );
});
