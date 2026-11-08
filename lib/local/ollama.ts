import "server-only";
import { LOCAL_CONFIG } from "./config";

/**
 * Minimal client for Ollama's /api/chat endpoint (running on this Mac).
 * `format` takes a JSON schema; Ollama then constrains the reply to it.
 */

export interface LocalMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /** Base64 images (no data: prefix), for vision models. */
  images?: string[];
}

export class LocalModelError extends Error {}

export async function chat(args: {
  agent: string;
  messages: LocalMessage[];
  format?: object;
  /** Let the model reason before answering (slower, more careful). Thinking models only. */
  think?: boolean;
  /** Use a different Ollama model than LOCAL_CONFIG.model for this call. */
  model?: string;
  timeoutMs?: number;
}): Promise<string> {
  const { ollamaUrl, contextTokens } = LOCAL_CONFIG;
  const model = args.model ?? LOCAL_CONFIG.model;
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: args.messages,
        // Streamed, so a long step keeps the connection busy. (Node's fetch gives up
        // on a response that sends nothing for 5 minutes.)
        stream: true,
        // Only send `think` when asked: instruct models don't support it.
        ...(args.think ? { think: true } : {}),
        format: args.format,
        options: { num_ctx: contextTokens },
        keep_alive: "10m",
      }),
      signal: AbortSignal.timeout(args.timeoutMs ?? 600_000),
    });
  } catch (e) {
    throw new LocalModelError(
      `Couldn't reach Ollama at ${ollamaUrl} (${e instanceof Error ? e.name : "error"}). Is it running?`,
    );
  }
  if (!res.ok || !res.body) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new LocalModelError(`Ollama returned ${res.status}: ${detail}`);
  }

  // Each line is a JSON chunk; the last one (done: true) carries the token counts.
  let content = "";
  let stats: { prompt_eval_count?: number; eval_count?: number } = {};
  let buffer = "";
  const decoder = new TextDecoder();
  try {
    for await (const piece of res.body as unknown as AsyncIterable<Uint8Array>) {
      buffer += decoder.decode(piece, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const chunk = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
          error?: string;
          prompt_eval_count?: number;
          eval_count?: number;
        };
        if (chunk.error) throw new LocalModelError(`Ollama: ${chunk.error}`);
        content += chunk.message?.content ?? "";
        if (chunk.done) stats = chunk;
      }
    }
  } catch (e) {
    if (e instanceof LocalModelError) throw e;
    throw new LocalModelError(`Ollama stopped mid-answer (${e instanceof Error ? e.name : "error"}).`);
  }

  // Log timing and token counts only, never content.
  console.log(
    `local ${args.agent}: ${((Date.now() - started) / 1000).toFixed(1)}s` +
      ` in=${stats.prompt_eval_count ?? "?"} out=${stats.eval_count ?? "?"}`,
  );
  return content;
}

/** chat() + JSON.parse, with one retry if the reply isn't valid JSON. */
export async function chatJson<T>(args: Parameters<typeof chat>[0] & { format: object }): Promise<T> {
  let last = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    last = await chat(args);
    try {
      return JSON.parse(last) as T;
    } catch {
      console.warn(`local ${args.agent}: reply wasn't valid JSON (attempt ${attempt})`);
    }
  }
  throw new LocalModelError(`${args.agent} didn't return valid JSON`);
}
