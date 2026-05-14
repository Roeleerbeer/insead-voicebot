import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";

const FRONT_MATTER = /^---\n[\s\S]*?\n---\n/;

function stripFrontMatter(text: string): string {
  return text.replace(FRONT_MATTER, "").trimStart();
}

/**
 * Read a content file from agent/content/ and return its rendered HTML.
 * Same source the LiveKit agent reads at startup, so the website Business case
 * tab and the bot's prompt context stay in sync from a single markdown file.
 */
export async function loadAgentContentHtml(filename: string): Promise<string> {
  const repoRoot = path.resolve(process.cwd(), "..");
  const filePath = path.join(repoRoot, "agent", "content", filename);
  const raw = await fs.readFile(filePath, "utf-8");
  const body = stripFrontMatter(raw);
  return marked.parse(body, { async: false }) as string;
}
