#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { PicmoviClient, AgentError } from "@picmovi/client";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0) return process.argv[idx + 1];
  return undefined;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const [cmd, sub] = process.argv.slice(2);
  const client = new PicmoviClient();

  if (cmd === "models" && sub === "list") {
    console.log(JSON.stringify(client.modelsList(arg("feature")), null, 2));
    return;
  }

  if (cmd === "credits") {
    console.log(JSON.stringify(await client.creditsGet(), null, 2));
    return;
  }

  if (cmd === "quote") {
    const quote = await client.generationQuote({
      capabilityId: required("capability"),
      prompt: arg("prompt"),
      values: {
        resolution: arg("resolution"),
        duration: arg("duration"),
        aspectRatio: arg("aspect-ratio"),
        motion: arg("motion"),
        camera: arg("camera"),
      },
      assetIds: { images: imagesFromArgs() },
    });
    console.log(JSON.stringify(quote, null, 2));
    return;
  }

  if (cmd === "generate") {
    const capabilityId = required("capability");
    const prompt = arg("prompt");
    const values = {
      resolution: arg("resolution"),
      duration: arg("duration"),
      aspectRatio: arg("aspect-ratio"),
      motion: arg("motion"),
      camera: arg("camera"),
    };
    const assetIds = { images: imagesFromArgs() };
    const quote = await client.generationQuote({ capabilityId, prompt, values, assetIds });
    const confirmed = Number(arg("confirm-credits"));
    if (!flag("yes") || confirmed !== quote.quotedCredits) {
      console.error(
        `Quote is ${quote.quotedCredits} credits to make video from this photo. Re-run with --yes --confirm-credits=${quote.quotedCredits}`
      );
      process.exit(2);
    }
    const created = await client.generationCreate({
      capabilityId,
      prompt,
      values,
      assetIds,
      confirmedCredits: confirmed,
      clientRequestId: arg("request-id") || randomUUID(),
    });
    console.log(JSON.stringify(created, null, 2));
    return;
  }

  if (cmd === "generations" && sub === "get") {
    console.log(JSON.stringify(await client.generationGet(required("id")), null, 2));
    return;
  }

  printHelp();
}

function imagesFromArgs(): string[] {
  const start = arg("photo") || arg("image");
  const end = arg("end-photo") || arg("end-image");
  const images: string[] = [];
  if (start) images.push(start);
  if (end) images.push(end);
  return images;
}

function required(name: string): string {
  const value = arg(name);
  if (!value) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

function printHelp(): void {
  console.log(`picmovi — photo to video CLI

  picmovi models list
  picmovi credits
  picmovi quote --capability photo-to-video.seedance25 --photo asset_start --duration 5s --resolution 480p
  picmovi generate --capability photo-to-video.seedance25 --photo asset_start --duration 5s --yes --confirm-credits=155
  picmovi generations get --id gen_...

Environment: PICMOVI_API_KEY, PICMOVI_BASE_URL, PICMOVI_MOCK=1
`);
}

main().catch((err) => {
  if (err instanceof AgentError) {
    console.error(JSON.stringify({ code: err.code, message: err.message, details: err.details }, null, 2));
    process.exit(1);
  }
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
