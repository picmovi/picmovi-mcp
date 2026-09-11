# PicMovi photo-to-video tool contract

Stable orchestration contract for PicMovi's public remote MCP. Live tool schemas win if they disagree with this file.

PicMovi's agent surface is **photo to video**: animate a still photo, or make video from a start photo plus an optional end-frame photo. It does not expose provider-specific Seedance/Veo HTTP APIs.

## Tools

| Tool | Purpose | Spends credits |
| --- | --- | --- |
| `models_list` | Discover photo-to-video capabilities | No |
| `credits_get` | Read spendable credits for the authenticated user | No |
| `generation_quote` | Validate product values and return `quotedCredits` | No |
| `generation_create` | Reserve credits and start one photo-to-video job | Yes |
| `generation_get` | Read one owned generation | No |

### models_list

Optional `feature`: `video` | `photo_to_video` | `photo-to-video`.

Each capability includes:

- stable `id` (pass through as `capabilityId`)
- `product: "photo_to_video"`
- `modelType` used only by PicMovi internals
- `startImageRequired`, `endImageSupported`
- `fields` (duration, resolution, aspect ratio, motion, camera)
- `estimatedCredits` for the cheapest listed preset — **not** the billable quote

### generation_quote / generation_create

Required:

- `capabilityId` from `models_list`
- `assetIds.images[0]` — owned start photo
- `assetIds.images[1]` — optional end photo when `endImageSupported`

Product `values` are capability fields, not raw provider parameters.

`generation_create` also requires:

- `confirmedCredits` equal to the latest quote
- `clientRequestId` — stable idempotency key for this exact request

### generation_get

`generationId` from create. Returns status, optional result URLs, and safe errors.

## Identity

- Remote `https://picmovi.com/api/mcp` is Streamable HTTP and OAuth-first.
- Local stdio uses `PICMOVI_API_KEY`.
- Never send a user id to select an account. Never ask the user to paste an access token. Never accept browser cookies as bearer credentials.

Suggested scopes: `models:read`, `credits:read`, `generations:create`, `generations:read`.

## Errors

| Code | Meaning |
| --- | --- |
| `unauthorized` | Missing or invalid credential |
| `forbidden_scope` | Token lacks the needed scope |
| `invalid_input` | Missing start photo, bad duration/resolution, extra end frame |
| `capability_not_found` | Unknown `capabilityId` |
| `asset_not_found` / `asset_expired` | Photo asset is missing or expired |
| `insufficient_credits` | Stop. Do not downgrade the model locally |
| `quote_changed` | Show the new quote and ask again |
| `parallel_limit_reached` | Plan concurrency is full. Poll, do not create again |
| `queue_full` | Waiting queue is full |
| `idempotency_conflict` | Same `clientRequestId`, different photo/values |
| `submission_unknown` | Outcome ambiguous. Do not retry create. Do not auto-refund. Poll if you have a `generationId` |
| `provider_failed` | Upstream generation failed |
| `generation_not_found` | Id is unknown or not owned by this user |

## Guardrails for hosts

- Submit `generation_create` **once** per human-approved photo-to-video request.
- Reuse `clientRequestId` only for an identical payload.
- After timeout or `submission_unknown`, never create a second job.
- Do not pass local filesystem paths, arbitrary URLs, or large base64 photos into MCP tools.

The pasteable Prompt template (keep in sync with picmovi.com/mcp) is in [prompt-template.md](./prompt-template.md).
