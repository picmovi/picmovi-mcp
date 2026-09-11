export type Feature = "video";

export type Product = "photo_to_video";

export type ErrorCode =
  | "unauthorized"
  | "forbidden_scope"
  | "invalid_input"
  | "capability_not_found"
  | "asset_not_found"
  | "asset_expired"
  | "insufficient_credits"
  | "quote_changed"
  | "parallel_limit_reached"
  | "queue_full"
  | "idempotency_conflict"
  | "submission_unknown"
  | "provider_failed"
  | "generation_not_found";

export type FieldOption = {
  value: string;
  label: string;
};

export type CapabilityField = {
  name: string;
  type: "enum" | "string" | "boolean" | "integer";
  required?: boolean;
  description: string;
  default?: string | number | boolean;
  options?: FieldOption[];
};

export type Capability = {
  id: string;
  feature: Feature;
  product: Product;
  modelType: string;
  label: string;
  description: string;
  estimatedCredits: number;
  estimatedSeconds?: number;
  startImageRequired: boolean;
  endImageSupported: boolean;
  fields: CapabilityField[];
};

export type AssetIds = {
  images?: string[];
  videos?: string[];
  audios?: string[];
};

export type GenerationValues = {
  resolution?: string;
  duration?: string | number;
  aspectRatio?: string;
  motion?: string;
  camera?: string;
  addSound?: boolean;
  [key: string]: unknown;
};

export type QuoteRequest = {
  capabilityId: string;
  prompt?: string;
  values?: GenerationValues;
  assetIds?: AssetIds;
};

export type QuoteResult = {
  capabilityId: string;
  quotedCredits: number;
  pricingKey: string;
  normalized: {
    prompt: string;
    values: GenerationValues;
    assetIds: AssetIds;
  };
};

export type CreateRequest = QuoteRequest & {
  confirmedCredits: number;
  clientRequestId: string;
};

export type GenerationStatus =
  | "queued"
  | "waiting_slot"
  | "running"
  | "succeeded"
  | "failed"
  | "submission_unknown";

export type GenerationRecord = {
  generationId: string;
  clientRequestId: string;
  status: GenerationStatus;
  quotedCredits: number;
  capabilityId: string;
  prompt: string;
  values: GenerationValues;
  assetIds: AssetIds;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorCode?: ErrorCode;
  errorMessage?: string;
  createdAt: string;
};

export type CreditsSnapshot = {
  credits: number;
  plan?: string;
  concurrency?: number;
};

export class AgentError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.details = details;
  }
}

export function errorPayload(err: unknown): { code: ErrorCode | "provider_failed"; message: string; details?: Record<string, unknown> } {
  if (err instanceof AgentError) {
    return { code: err.code, message: err.message, details: err.details };
  }
  return {
    code: "provider_failed",
    message: err instanceof Error ? err.message : "Unexpected error",
  };
}
