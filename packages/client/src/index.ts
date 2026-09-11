import {
  AgentError,
  CAPABILITIES,
  listCapabilities,
  MockAgentBackend,
  quotePhotoToVideo,
  type Capability,
  type CreateRequest,
  type CreditsSnapshot,
  type ErrorCode,
  type GenerationRecord,
  type QuoteRequest,
  type QuoteResult,
} from "@picmovi/agent-core";

export type PicmoviClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  mock?: boolean;
};

type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
};

function useMock(options: PicmoviClientOptions): boolean {
  if (options.mock === true) return true;
  if (options.mock === false) return false;
  return process.env.PICMOVI_MOCK === "1" || process.env.PICMOVI_MOCK === "true";
}

export class PicmoviClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly mockBackend: MockAgentBackend | null;

  constructor(options: PicmoviClientOptions = {}) {
    this.apiKey = options.apiKey || process.env.PICMOVI_API_KEY || "";
    this.baseUrl = (options.baseUrl || process.env.PICMOVI_BASE_URL || "https://api.picmovi.com").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl || fetch;
    this.mockBackend = useMock(options) ? new MockAgentBackend() : null;
  }

  modelsList(feature?: string): Capability[] {
    if (this.mockBackend) return listCapabilities(feature);
    return listCapabilities(feature);
  }

  async creditsGet(): Promise<CreditsSnapshot> {
    if (this.mockBackend) return this.mockBackend.listCredits();
    const data = await this.request<CreditsSnapshot>("GET", "/api/agent/v1/credits");
    return data;
  }

  async generationQuote(input: QuoteRequest): Promise<QuoteResult> {
    if (this.mockBackend) return this.mockBackend.quote(input);
    if (!this.apiKey) return quotePhotoToVideo(input);
    return this.request<QuoteResult>("POST", "/api/agent/v1/generations/quote", input);
  }

  async generationCreate(input: CreateRequest): Promise<GenerationRecord> {
    if (this.mockBackend) return this.mockBackend.create(input);
    return this.request<GenerationRecord>("POST", "/api/agent/v1/generations", input);
  }

  async generationGet(generationId: string): Promise<GenerationRecord> {
    if (this.mockBackend) return this.mockBackend.get(generationId);
    return this.request<GenerationRecord>("GET", `/api/agent/v1/generations/${encodeURIComponent(generationId)}`);
  }

  catalog(): Capability[] {
    return CAPABILITIES;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.apiKey) {
      throw new AgentError(
        "unauthorized",
        "Set PICMOVI_API_KEY, or PICMOVI_MOCK=1 for a local photo-to-video dry run."
      );
    }
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      accept: "application/json",
    };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    } catch {
      throw new AgentError(
        "submission_unknown",
        "The request did not complete. Do not create again. Poll generation_get if you already have a generationId."
      );
    }

    const json = (await response.json().catch(() => ({}))) as ApiErrorBody & T;
    if (!response.ok) {
      const code = (json.code || mapStatus(response.status)) as ErrorCode;
      throw new AgentError(code, json.message || `PicMovi agent API ${response.status}`, json.details);
    }
    return json as T;
  }
}

function mapStatus(status: number): ErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden_scope";
  if (status === 402) return "insufficient_credits";
  if (status === 404) return "generation_not_found";
  if (status === 409) return "idempotency_conflict";
  if (status === 429) return "parallel_limit_reached";
  return "provider_failed";
}

export { AgentError, listCapabilities, quotePhotoToVideo };
