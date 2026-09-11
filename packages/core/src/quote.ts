import { getCapability } from "./catalog.js";
import { buildPricingKey, lookupCredits, normalizeDuration, normalizeResolution } from "./pricing.js";
import { AgentError, type AssetIds, type GenerationValues, type QuoteRequest, type QuoteResult } from "./types.js";

function fieldDefault(cap: NonNullable<ReturnType<typeof getCapability>>, name: string): string | undefined {
  const field = cap.fields.find((item) => item.name === name);
  if (field?.default == null) return undefined;
  return String(field.default);
}

function assertEnum(capId: string, name: string, value: string, allowed: string[]): void {
  if (!allowed.includes(value)) {
    throw new AgentError("invalid_input", `Unsupported ${name} "${value}" for ${capId}.`, {
      field: name,
      allowed,
    });
  }
}

export function quotePhotoToVideo(input: QuoteRequest): QuoteResult {
  const cap = getCapability(input.capabilityId);
  if (!cap) {
    throw new AgentError("capability_not_found", `Unknown photo-to-video capability: ${input.capabilityId}`);
  }

  const values: GenerationValues = { ...(input.values || {}) };
  const images = [...(input.assetIds?.images || [])];

  if (cap.startImageRequired && images.length < 1) {
    throw new AgentError(
      "invalid_input",
      "Photo to video needs a start photo. Upload the photo first and pass it as assetIds.images[0].",
      { field: "assetIds.images" }
    );
  }
  if (images.length > 1 && !cap.endImageSupported) {
    throw new AgentError(
      "invalid_input",
      `${cap.label} uses a single photo. Do not pass an end-frame image.`,
      { field: "assetIds.images" }
    );
  }
  if (images.length > 2) {
    throw new AgentError("invalid_input", "Pass at most two photos: start frame, optional end frame.");
  }

  const resolutionField = cap.fields.find((item) => item.name === "resolution");
  const durationField = cap.fields.find((item) => item.name === "duration");
  const ratioField = cap.fields.find((item) => item.name === "aspectRatio");
  const motionField = cap.fields.find((item) => item.name === "motion");
  const cameraField = cap.fields.find((item) => item.name === "camera");

  if (resolutionField?.options) {
    const fallback = fieldDefault(cap, "resolution") || resolutionField.options[0].value;
    const chosen = String(values.resolution || fallback);
    assertEnum(cap.id, "resolution", chosen, resolutionField.options.map((item) => item.value));
    values.resolution = chosen;
  }

  if (durationField?.options) {
    const fallback = fieldDefault(cap, "duration") || durationField.options[0].value;
    const chosen = `${normalizeDuration(values.duration, fallback)}s`;
    assertEnum(cap.id, "duration", chosen, durationField.options.map((item) => item.value));
    values.duration = chosen;
  }

  if (ratioField?.options) {
    const fallback = fieldDefault(cap, "aspectRatio") || ratioField.options[0].value;
    const chosen = String(values.aspectRatio || fallback);
    assertEnum(cap.id, "aspectRatio", chosen, ratioField.options.map((item) => item.value));
    values.aspectRatio = chosen;
  }

  if (motionField?.options) {
    const chosen = String(values.motion || motionField.default || "steady");
    assertEnum(cap.id, "motion", chosen, motionField.options.map((item) => item.value));
    values.motion = chosen;
  }

  if (cameraField?.options) {
    const chosen = String(values.camera || cameraField.default || "static");
    assertEnum(cap.id, "camera", chosen, cameraField.options.map((item) => item.value));
    values.camera = chosen;
  }

  const durationSec = normalizeDuration(values.duration, "5");
  const resolution = normalizeResolution(
    typeof values.resolution === "string" ? values.resolution : undefined,
    "480"
  );
  const pricingKey = buildPricingKey(cap.modelType, resolution, durationSec);
  const quotedCredits = lookupCredits(pricingKey);
  if (quotedCredits == null) {
    throw new AgentError("invalid_input", `No photo-to-video price for ${pricingKey}.`, { pricingKey });
  }

  const assetIds: AssetIds = { images };
  const prompt = (input.prompt || "").trim();

  return {
    capabilityId: cap.id,
    quotedCredits,
    pricingKey,
    normalized: { prompt, values, assetIds },
  };
}

export function requestFingerprint(input: {
  capabilityId: string;
  prompt?: string;
  values?: GenerationValues;
  assetIds?: AssetIds;
}): string {
  return JSON.stringify({
    capabilityId: input.capabilityId,
    prompt: input.prompt || "",
    values: input.values || {},
    assetIds: input.assetIds || {},
  });
}
