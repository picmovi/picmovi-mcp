# PicMovi Photo to Video MCP

Open-source agent tools for [PicMovi](https://picmovi.com), a **photo to video** platform: turn still photos into short clips, or **make video from photos** with an optional last-frame still.

This repository ships a typed REST client, a CLI, and a local stdio MCP adapter. Live identity, credits, quotes, owned photos, plan concurrency, and video jobs are served by PicMovi Agent REST (`/api/agent/v1/*`). Hosted Streamable HTTP MCP (`/api/mcp` + OAuth) is the later remote-MCP path.

## What agents can do

Connected agents can:

1. Discover photo-to-video models (`models_list`)
2. Check spendable credits (`credits_get`)
3. Quote a photo-to-video job (`generation_quote`) — no charge
4. After explicit credit approval, start **one** job (`generation_create`)
5. Poll the clip (`generation_get`)

Credits are spent only when a video is actually submitted, at the same list prices as picmovi.com. Listing models, quoting, and polling do not deduct credits.

## Hosted MCP (OAuth, later)

When the host supports remote MCP, the Streamable HTTP endpoint will be:

```json
{
  "mcpServers": {
    "picmovi": {
      "url": "https://picmovi.com/api/mcp"
    }
  }
}
```

Until that ships, use the local stdio adapter below. It calls Agent REST on `PICMOVI_BASE_URL` (production `https://api.picmovi.com`). Keys and photo IDs come from [picmovi.com/mcp](https://picmovi.com/mcp).

## Local stdio MCP

```json
{
  "mcpServers": {
    "picmovi": {
      "command": "npx",
      "args": ["-y", "picmovi-mcp"],
      "env": {
        "PICMOVI_API_KEY": "${PICMOVI_API_KEY}",
        "PICMOVI_BASE_URL": "https://api.picmovi.com"
      }
    }
  }
}
```

From this repo while developing, `args` must be an **absolute** path to `packages/mcp/dist/index.js` (a relative path is resolved from the home directory and fails):

```json
{
  "mcpServers": {
    "picmovi": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/picmovi_mcp/packages/mcp/dist/index.js"],
      "cwd": "/ABSOLUTE/PATH/picmovi_mcp",
      "env": {
        "PICMOVI_MOCK": "1"
      }
    }
  }
}
```

`PICMOVI_MOCK=1` runs a local dry-run so you can wire Cursor without a live key. It still enforces photo-to-video quotes, idempotency, and a per-account parallel limit. **It does not read your picmovi.com credits.**

Create a key on [picmovi.com/mcp](https://picmovi.com/mcp). See [docs/agent-api.md](./docs/agent-api.md) for the REST contract the adapter calls.

## Prompt template

Same copy as [picmovi.com/mcp](https://picmovi.com/mcp). Paste into the agent after you click a photo on that page. “Use photo-to-video.…” picks the model (no picker in chat). Motion prompt is the same i2v text you type in the studio — what happens in the clip. “subtle motion” is motion strength, not that story. Delete the Motion prompt line if you only want a generic animate.

```
Animate my photo assetId: PASTE_ASSET_ID_HERE
for 5 seconds with subtle motion.
Use photo-to-video.seedance25 at 480p.
Motion prompt: She blinks slowly, a light breeze moves her hair, camera stays locked.
Quote credits first, then generate after I confirm.
```

## CLI

```bash
npm run build
export PICMOVI_MOCK=1
node packages/cli/dist/index.js models list
node packages/cli/dist/index.js quote \
  --capability photo-to-video.seedance25 \
  --photo asset_start \
  --duration 5s \
  --resolution 480p
```

`generate` quotes first and requires `--yes --confirm-credits=<exact quote>` plus a stable `--request-id` when you retry.

## Photo to video workflow

1. **Discover.** Call `models_list`. Pick a returned `id` such as `photo-to-video.seedance25`. Do not invent a model.
2. **Prepare the photo.** Upload through a trusted PicMovi surface. Pass `assetIds.images[0]` as the start photo. If the capability sets `endImageSupported`, `images[1]` is the optional last frame.
3. **Quote.** Call `generation_quote` with `capabilityId`, motion `prompt`, `values` (duration, resolution, camera), and `assetIds`. Treat `quotedCredits` as authoritative.
4. **Confirm.** Show the human the exact credit amount to **make video from this photo**. A vague “generate” is not confirmation.
5. **Create once.** Send the same payload, `confirmedCredits`, and a new stable `clientRequestId`. Reuse that id only for the identical request.
6. **Poll.** Call `generation_get`. Do not create again after a timeout or `submission_unknown`.

## Concurrency

The same PicMovi account cannot stack unlimited parallel photo-to-video jobs. The server returns:

| Code | Meaning |
| --- | --- |
| `parallel_limit_reached` | In-flight jobs already hit the plan cap. Poll until one finishes. |
| `queue_full` | Waiting queue is full. Try later. |
| `idempotency_conflict` | `clientRequestId` was reused with different input. |
| `insufficient_credits` | Not enough credits for this photo-to-video quote. |
| `quote_changed` | Confirm the new `quotedCredits` before create. |

Read-only tools do not occupy concurrency slots.

## Development

```bash
npm install
npm test
npm run build
```

Packages:

- `@picmovi/agent-core` — photo-to-video catalog, quotes, mock backend
- `@picmovi/client` — Agent REST v1 client
- `picmovi-cli` — command-line adapter
- `picmovi-mcp` — local stdio MCP adapter
- [`server.json`](./server.json) — hosted MCP Registry metadata

## Publishing this listing

Submit the public GitHub repo at [https://mcpservers.org/submit](https://mcpservers.org/submit). Details: [docs/publishing.md](./docs/publishing.md). Contract: [docs/tool-contract.md](./docs/tool-contract.md). Prompt template: [docs/prompt-template.md](./docs/prompt-template.md). Agent skill: [skills/picmovi-photo-to-video/SKILL.md](./skills/picmovi-photo-to-video/SKILL.md).

## Security and license

Do not commit API keys. Hosted MCP uses OAuth; local adapters read `PICMOVI_API_KEY` from the environment. MIT-0, see [LICENSE](./LICENSE).
