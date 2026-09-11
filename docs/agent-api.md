# Agent REST v1 (hosted)

The stdio MCP (`picmovi-mcp`) and CLI call these paths on `PICMOVI_BASE_URL` with:

```
Authorization: Bearer <PICMOVI_API_KEY>
```

The key is created once on [picmovi.com/mcp](https://picmovi.com/mcp). The server stores only a hash.

| Env | Value |
| --- | --- |
| `PICMOVI_API_KEY` | Full `pmv_…` key from [picmovi.com/mcp](https://picmovi.com/mcp) |
| `PICMOVI_BASE_URL` | `https://api.picmovi.com` |

Do not set `PICMOVI_MOCK=1` when you want live credits and generations.

All routes are **photo to video** / **make video from photos**. Credits are reserved only on create.

## Routes

| Method | Path | Spends credits |
| --- | --- | --- |
| GET | `/api/agent/v1/credits` | No |
| POST | `/api/agent/v1/generations/quote` | No |
| POST | `/api/agent/v1/generations` | Yes |
| GET | `/api/agent/v1/generations/:id` | No |

`models_list` is served from the local catalog in `@picmovi/agent-core`. Quotes and creates use the same list prices as picmovi.com.

### GET `/api/agent/v1/credits`

```json
{ "credits": 120, "plan": "starter", "concurrency": 2 }
```

### POST `/api/agent/v1/generations/quote`

Body: `capabilityId`, optional `prompt`, `values`, `assetIds`.

Start photo: `assetIds.images[0]` (My Upload `user_assets.id` or a succeeded My Generation image id). Optional last frame: `images[1]` when the capability sets `endImageSupported`.

Response:

```json
{
  "capabilityId": "photo-to-video.seedance25",
  "quotedCredits": 155,
  "pricingKey": "seedance25_480p5s",
  "normalized": { "prompt": "subtle motion", "values": {}, "assetIds": { "images": ["…"] } }
}
```

### POST `/api/agent/v1/generations`

Same as quote plus:

- `confirmedCredits` — must equal `quotedCredits`
- `clientRequestId` — ≥ 8 chars, unique per payload

The clip appears under Products when it succeeds.

### GET `/api/agent/v1/generations/:id`

Owner-scoped. Status values: `queued` | `waiting_slot` | `running` | `succeeded` | `failed`.

On success: `videoUrl` (CDN) and optional `thumbnailUrl`.

## Errors

JSON `{ "code", "message", "details?" }` using the vocabulary in [tool-contract.md](./tool-contract.md).

## Server rules

1. Resolve `Authorization: Bearer` to one PicMovi user (key hash only; the full key is shown once on `/mcp`).
2. Quote with the same list prices as picmovi.com.
3. Deduct credits only on create. Unlimited plans may charge 0 for non-SOTA jobs and still create a ledger row.
4. If in-flight jobs already hit plan concurrency, return `parallel_limit_reached` and do not start another job.
5. If the waiting queue is full, return `queue_full`.
6. Reuse of `clientRequestId` with the same payload returns the original job; a different payload → `idempotency_conflict`.
7. List / quote / get never occupy a slot.

## Hosted Streamable HTTP MCP

`https://picmovi.com/api/mcp` (OAuth) is not required for the local stdio adapter. Stdio calls Agent REST above. Registry metadata: [`server.json`](../server.json).
