import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Read-only replacement for the legacy handoff notice. Never create directories,
// read transcript content, sync global configuration, or run a Git mutation.
const root = fileURLToPath(new URL("../../", import.meta.url));
const slug = root.toLowerCase().replace(/\\/g, "/").replace(/^\//, "")
  .replace(/^([a-z]):/, "$1").replace(/[^a-z0-9]*$/, "")
  .replace(/[^a-z0-9]/g, "-");
const context = [
  "Read docs/agent-history.md for previous decisions and unfinished work.",
  "Read docs/codex-migration.md for current configuration and migration gaps.",
  "Preserve CLAUDE.md and all files under .claude/ and ~/.claude/ until the user lifts the hold.",
];

for (const dir of [resolve(root, ".codex/handoffs"), resolve(homedir(), ".claude/handoffs", slug)]) {
  try {
    const names = (await readdir(dir)).filter((name) => name.endsWith(".md")).sort();
    if (names.length) context.push(`Read the latest handoff before related work: ${resolve(dir, names.at(-1))}`);
  } catch (error) {
    if (error.code !== "ENOENT") context.push(`Handoff lookup unavailable (${error.code}); check manually.`);
  }
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context.join("\n") },
}) + "\n");
