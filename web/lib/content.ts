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
 *
 * Path resolution: AGENT_CONTENT_DIR env var wins. Otherwise fall back to
 * ../agent/content/ relative to cwd (works for `pnpm dev` from web/). In the
 * production Docker image cwd is /app and the markdown is copied to
 * /app/agent/content/ — compose.prod.yml sets AGENT_CONTENT_DIR there.
 */
export async function loadAgentContentHtml(filename: string): Promise<string> {
  const baseDir =
    process.env.AGENT_CONTENT_DIR ??
    path.resolve(process.cwd(), "..", "agent", "content");
  const filePath = path.join(baseDir, filename);
  const raw = await fs.readFile(filePath, "utf-8");
  const body = stripFrontMatter(raw);
  return marked.parse(body, { async: false }) as string;
}
