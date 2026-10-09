// Appends new Claude Code request usage to ~/.claude/usage/ledger.jsonl before transcripts are cleaned up.
import { appendFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

const ROOT = join(homedir(), ".claude", "projects");
const DATA = join(homedir(), ".claude", "usage");
const LEDGER = join(DATA, "ledger.jsonl");
const STATE = join(DATA, "state.json");

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.name.endsWith(".jsonl")) {
      yield path;
    }
  }
}

async function readOr(path, fallback) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return fallback;
  }
}

// Subagent transcripts live in <session>/subagents/, so they count toward their parent session.
function sessionOf(file) {
  const parts = file.split("/");
  const at = parts.indexOf("subagents");
  return at > 0 ? parts[at - 1] : basename(file, ".jsonl");
}

async function main() {
  await mkdir(DATA, { recursive: true });
  const seen = new Set();
  for (const raw of (await readOr(LEDGER, "")).split("\n")) {
    try {
      if (raw) {
        seen.add(JSON.parse(raw).id);
      }
    } catch {
      // A torn line must not stop capture; its request is re-read if its file changed.
    }
  }
  let state = {};
  try {
    state = JSON.parse(await readOr(STATE, "{}"));
  } catch {
    state = {};
  }
  const nextState = {};
  const added = [];

  for await (const file of walk(ROOT)) {
    let mtimeMs;
    let text;
    try {
      ({ mtimeMs } = await stat(file));
      if (state[file] === mtimeMs) {
        nextState[file] = mtimeMs;
        continue;
      }
      text = await readFile(file, "utf8");
    } catch {
      continue; // deleted mid-run by transcript cleanup
    }
    nextState[file] = mtimeMs;
    const session = sessionOf(file);
    for (const raw of text.split("\n")) {
      if (!raw) {
        continue;
      }
      let line;
      try {
        line = JSON.parse(raw);
      } catch {
        continue;
      }
      const usage = line.message?.usage;
      const model = line.message?.model ?? "unknown";
      const id = line.requestId ?? line.uuid;
      if (line.type !== "assistant" || !usage || !id || !line.timestamp) {
        continue;
      }
      if (model === "<synthetic>" || seen.has(id)) {
        continue;
      }
      seen.add(id);
      added.push({
        id,
        s: session,
        d: line.timestamp.slice(0, 10),
        m: model,
        t:
          (usage.input_tokens ?? 0) +
          (usage.output_tokens ?? 0) +
          (usage.cache_read_input_tokens ?? 0) +
          (usage.cache_creation_input_tokens ?? 0),
      });
    }
  }

  if (added.length) {
    await appendFile(LEDGER, added.map((row) => `${JSON.stringify(row)}\n`).join(""));
  }
  await writeFile(`${STATE}.tmp`, JSON.stringify(nextState));
  await rename(`${STATE}.tmp`, STATE);
}

main().catch((error) => {
  console.error(`usage ledger: ${error.message}`);
  process.exit(0);
});
