---
name: picmovi-photo-to-video
description: Use PicMovi photo-to-video tools to make short videos from still photos. Use when a user asks to animate a photo, turn an image into video, make video from photos, quote PicMovi credits, or check a PicMovi generation.
---

# PicMovi Photo to Video

Use the photo-to-video catalog, not provider-specific APIs. The host should connect the local `picmovi-mcp` stdio adapter (`PICMOVI_API_KEY` + `PICMOVI_BASE_URL`). Remote OAuth MCP at `https://picmovi.com/api/mcp` is optional and later.

Let the host handle OAuth or `PICMOVI_API_KEY`. Never ask the user to paste an access token. Never expose provider endpoints, callback URLs, raw provider parameters, or private account identifiers.

If MCP is not connected, stop and ask the user to connect PicMovi. Do not substitute an arbitrary video API.

## About PicMovi

[PicMovi](https://picmovi.com) turns **photos into video**. Agents pick a capability (Seedance, Veo, Wan, Kling, and others), pass one start photo (and optional last-frame photo), quote credits, then generate a short clip.

## Workflow

1. **Discover.** Call `models_list`. Select a returned stable `id` such as `photo-to-video.seedance25`. Do not invent a model.
2. **Prepare photos.** Open [picmovi.com/mcp](https://picmovi.com/mcp), click a photo in My Upload or My Generation, and copy the id. Pass it as `assetIds.images[0]`. If `endImageSupported`, `images[1]` may be the last frame. Never pass filesystem paths, random URLs, or large base64.
3. **Quote.** Call `generation_quote` with `capabilityId`, motion `prompt`, `values`, and `assetIds`. Treat `quotedCredits` as authoritative. Never invent a price. Use `credits_get` only when the user asks about balance.
4. **Confirm.** Show the capability, the photo, duration/resolution, and the exact credit amount to **make video from this photo**. Ask for explicit approval. A vague “generate” is not confirmation. If the server returns `quote_changed`, show the new quote and ask again.
5. **Create once.** Generate a stable `clientRequestId` before `generation_create`. Send the same payload as the quote plus `confirmedCredits`. Submit exactly once. Reuse the id only for the identical request.
6. **Poll.** Call `generation_get` with backoff. Report only status, safe errors, and result URLs the tool returned.

## Prompt template

Match [picmovi.com/mcp](https://picmovi.com/mcp). If the user pastes this, follow it: quote first, wait for confirm, then create once.

```
Animate my photo assetId: PASTE_ASSET_ID_HERE
for 5 seconds with subtle motion.
Use photo-to-video.seedance25 at 480p.
Motion prompt: She blinks slowly, a light breeze moves her hair, camera stays locked.
Quote credits first, then generate after I confirm.
```

- `assetId` → `assetIds.images[0]`
- `Use photo-to-video.seedance25 at 480p` → `capabilityId` + `values.resolution`
- `for 5 seconds` / `subtle motion` → `values.duration` / `values.motion`
- **Motion prompt** → generation `prompt` (i2v text). If omitted, ask or use a short generic motion line.

## Guardrails

- `submission_unknown`: do not create again; do not refund; poll if you have a generation id.
- `insufficient_credits`: stop. Do not silently pick a cheaper model.
- `parallel_limit_reached` / `queue_full`: wait and poll; do not open extra jobs.
- `idempotency_conflict`: quote the corrected request with a new `clientRequestId`.
- `unauthorized` / `forbidden_scope`: the user must reconnect PicMovi.

For field-level contract details see the repository `docs/tool-contract.md`.
