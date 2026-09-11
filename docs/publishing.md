# Publish PicMovi MCP listings

Listings describe the **photo to video** MCP server, not the marketing homepage.

## mcpservers.org

1. Push this repo publicly (GitHub topics: `mcp`, `model-context-protocol`, `photo-to-video`, `image-to-video`).
2. Open [https://mcpservers.org/submit](https://mcpservers.org/submit).
3. Suggested fields:
   - **Server Name:** PicMovi Photo to Video
   - **Short Description:** Make video from photos. Quote credits, then generate a short clip from a still (optional last frame) with PicMovi models.
   - **Link:** this GitHub repository
   - **Category:** Design
   - **Contact Email:** your team email
4. Free submit is enough. Optional $39 premium for faster review and a dofollow link.

Expected listing URL: `https://mcpservers.org/servers/<github-owner>/<repo-name>`

Do not open a PR on wong2/awesome-mcp-servers. That list only accepts the web form.

## Official MCP Registry

Keep `server.json` in the repo root. After the hosted endpoint `https://picmovi.com/api/mcp` is live:

```bash
mcp-publisher login github
mcp-publisher publish
```

`com.picmovi/*` namespaces require the remote URL to live on `picmovi.com`.

Guides:

- https://modelcontextprotocol.info/tools/registry/publishing/
- https://modelcontextprotocol.io/registry/github-actions

## Other directories

| Directory | URL |
| --- | --- |
| PulseMCP | https://pulsemcp.com/submit |
| Smithery | https://smithery.ai/new |
| mcp.so | https://mcp.so |
| Glama | auto-index from GitHub topics |

Publish the GitHub repo first so directories can link it. Agent REST (`/api/agent/v1/*`) is what the stdio MCP calls today. Hosted `https://picmovi.com/api/mcp` is the later OAuth remote.

Keep `server.json` `repository.url` in sync with the public GitHub URL before submit.
