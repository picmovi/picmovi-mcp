#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AgentError, errorPayload } from "@picmovi/agent-core";
import { PicmoviClient } from "@picmovi/client";
import { z } from "zod";

const assetIdsShape = z
  .object({
    images: z
      .array(z.string())
      .max(2)
      .describe("Start photo as images[0]. Optional end-frame photo as images[1] when the model supports it.")
      .optional(),
    videos: z.array(z.string()).optional(),
    audios: z.array(z.string()).optional(),
  })
  .optional();

const valuesShape = z
  .object({
    resolution: z.string().optional(),
    duration: z.union([z.string(), z.number()]).optional(),
    aspectRatio: z.string().optional(),
    motion: z.string().optional(),
    camera: z.string().optional(),
    addSound: z.boolean().optional(),
  })
  .passthrough()
  .optional();

function jsonResult(data: unknown, isError = false) {
  return {
    isError,
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function fail(err: unknown) {
  return jsonResult(errorPayload(err), true);
}

export function createPicmoviMcpServer(client = new PicmoviClient()): McpServer {
  const server = new McpServer(
    {
      name: "picmovi-photo-to-video",
      version: "0.1.0",
    },
    {
      instructions:
        "PicMovi turns photos into short videos. Discover a photo-to-video capability, quote credits, get explicit approval, then create once with a stable clientRequestId. Poll generation_get. Do not retry after timeouts.",
    }
  );

  server.tool(
    "models_list",
    "List PicMovi photo-to-video capabilities for making video from photos. Returns stable capability ids, fields, and estimated credits. Does not spend credits.",
    {
      feature: z
        .enum(["video", "photo_to_video", "photo-to-video"])
        .optional()
        .describe("Optional filter. All current capabilities are photo-to-video."),
    },
    async ({ feature }) => {
      try {
        return jsonResult({
          product: "photo_to_video",
          website: "https://picmovi.com",
          capabilities: client.modelsList(feature),
        });
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "credits_get",
    "Read the authenticated user's spendable PicMovi credits. Does not spend credits. Use before a paid photo-to-video run when the user asks about balance.",
    {},
    async () => {
      try {
        return jsonResult(await client.creditsGet());
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "generation_quote",
    "Validate a photo-to-video request and return server quotedCredits. Pass the start photo as assetIds.images[0]. Does not start generation and does not spend credits.",
    {
      capabilityId: z.string().describe("Capability id from models_list, e.g. photo-to-video.seedance25"),
      prompt: z.string().optional().describe("Motion prompt for how the photo should move."),
      values: valuesShape,
      assetIds: assetIdsShape,
    },
    async (args) => {
      try {
        return jsonResult(await client.generationQuote(args));
      } catch (err) {
        return fail(err);
      }
    }
  );

  server.tool(
    "generation_create",
    "Reserve credits and start one photo-to-video job. Requires confirmedCredits from the quote plus a stable clientRequestId. Submit once; reuse the id only for the identical request.",
    {
      capabilityId: z.string(),
      prompt: z.string().optional(),
      values: valuesShape,
      assetIds: assetIdsShape,
      confirmedCredits: z.number().int().positive(),
      clientRequestId: z.string().min(8).describe("Stable idempotency key for this exact photo-to-video request."),
    },
    async (args) => {
      try {
        return jsonResult(await client.generationCreate(args));
      } catch (err) {
        if (err instanceof AgentError && err.code === "submission_unknown") {
          return jsonResult(errorPayload(err), true);
        }
        return fail(err);
      }
    }
  );

  server.tool(
    "generation_get",
    "Read one owned photo-to-video generation: status, queue position, and result URLs when ready. Does not spend credits.",
    {
      generationId: z.string(),
    },
    async ({ generationId }) => {
      try {
        return jsonResult(await client.generationGet(generationId));
      } catch (err) {
        return fail(err);
      }
    }
  );

  return server;
}

async function main(): Promise<void> {
  const server = createPicmoviMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
