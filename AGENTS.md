# KasperSimonsen.dev — agent instructions

## Instruction source and migration

Codex reads this file directly. Edit `AGENTS.md` for Codex guidance. The legacy
`CLAUDE.md` and `.claude/` remain preserved until the user approves changes.
Do not run `npm run agents:sync`: it would overwrite the Codex adaptations.
Keep the Next.js warning below. Read `AGENTS.local.md`, when present, for local
supplemental guidance; it is ignored by Git.

Read [agent history](docs/agent-history.md) for prior decisions and open threads.
Read [migration notes](docs/codex-migration.md) for setup, plugin mappings and gaps.

Current user instructions take precedence. Older plans in `docs/superpowers/`
remain technical references, but their prior-agent attribution, session URLs, plugin
cache paths, task-tracking exemptions, and instructions to keep `.agents/`
untracked belong to those sessions. For new work, follow this file and the
current task's authorization. Never misattribute work or invent a session URL,
task code, commit, or test result.

## Project and layout

Kasper's portfolio and development-practice website uses Next.js 16.2.4 App
Router, React 19, TypeScript, Tailwind 4, GSAP, and React Three Fiber. Use npm and
`package-lock.json`. Node 24 is the verified local runtime.

- `app/(office)/`: the 3D office homepage at `/` and service pages.
- `office/`: camera, director, hotspots, interaction state, cards, and scene styling.
- `panels/`: office case-study, service, and contact panels.
- `content/`: office content, screenshots, sleeves, and document templates/data.
- `app/(main)/`: conventional work, contact, work-with-me, login, and admin pages.
- `app/(v2)/`: the editorial `/v2` site and case studies.
- `app/api/`, `lib/admin/`: contact delivery and local document administration.
- `art/`, `scripts/blender/`, `scripts/models/`, `scripts/osm/`: 3D sources/tooling.
- `e2e/`: Playwright checks; colocated `*.test.ts`/`*.test.mjs`: Vitest.
- `docs/`: briefs, specs, plans, history and `docs/codex-migration.md` for setup.

## Commands and verification

- `npm ci`: install locked dependencies for a new checkout.
- `npm run dev`: development at `http://localhost:3010`.
- `npm run dev:admin`: the same port with the existing admin development command.
- `npm test`: Vitest unit and model-script tests.
- `npx tsc --noEmit`: TypeScript check.
- `npm run check:models`: validate GLB names, cameras, animations, and size budgets.
- `npm run build`: production build; prebuild runs the model check.
- `npm run test:e2e -- e2e/<spec>.spec.ts --workers=1`: one browser spec at a time.
- Legacy `agents:sync` / `agents:check` compare against the preserved source and
  are superseded for Codex; their pending setup is left unchanged.

There is no lint command. Run checks appropriate to the change and report actual
results. Unit tests do not need production credentials. The build currently
imports Resend at module scope and requires `RESEND_API_KEY`; Google fonts and
GitHub-backed pages can need network access. Use 1Password for real credentials
and report missing prerequisites rather than treating an environment failure as
a passed build.

One headless browser at a time on Kasper's PC: Playwright uses `--workers=1`,
one spec per command, and no concurrent screenshot browser. Check port 3010
before starting a server. Reuse an existing shared server, do not kill other
sessions' processes, and report a missing server when the current task forbids
starting one.

## Task tracking

monday.com board: **KasperSimonsen.dev**, ID **5102421912**, in
**Software Automation** workspace **5217812**. Existing task prefix: **KSDEV**.
Verify the board at session start; reconcile additively and keep existing groups
and status labels. Do not create a duplicate board.

Before non-trivial work, find or create the item in the group matching its kind
and set its active status. Allocate `max(Task No) + 1`; skip numbers already
referenced in commits. Derive `KSDEV-n` from the ordinal and include the code in
commit messages and PR titles. Keep the mandatory task columns and per-item
Brief with What, How, Actioned by, Involved, and Source. Leave Gate blank unless
the item actually blocks a milestone.

Verify every status write by a read that includes the status column. On
completion, set Done and post the result with verified commit/PR references
when they exist. Discovered bugs and follow-ups get their own items. If monday
tools are unavailable, report it and keep a local record of actual work; never
invent codes or claim the board was updated. An old waiver is not a continuing
waiver.

## Secrets and external tools

1Password is the source of secrets. Resolve the project's Environment with
`list_environments`; its existing imported name is `kaspersimonsen-dev`. Reuse
that Environment rather than silently creating or renaming one. Do not put its
ID or credentials in repository files. On Windows, use the beta CLI:
`op run --environment <resolved-id> -- npm.cmd run dev` (or `build`). Never
create local `.env` mounts on Windows or print credential values.

Runtime names: `RESEND_API_KEY` for contact delivery; `GITHUB_TOKEN` and optional
`GITHUB_USERNAME` for activity; `ADMIN_PASSWORD` and `ADMIN_SECRET` for local
admin; `GEMINI_API_KEY` for the optional texture-generation script. Check the
code for precise requirements. Admin routes are disabled in production. If
legacy plaintext credentials are found, follow the 1Password migration workflow,
flag the file, and delete it only when asked.

The host's Codex configuration provides MCP/plugin connections. Check live
availability and authentication instead of copying Claude permission strings
or hardcoded executable paths into this repo. Workflows use monday, 1Password,
and Blender; use Vercel for deployment inspection when requested. See
`docs/codex-migration.md` for setup and authentication.

## Content, design, and models

Office copy lives in `office/copy.ts`; reel labels/alt text in
`content/screens.ts`; project words in `app/(main)/work/data.ts` and
`app/(v2)/v2/work/caseStudies.ts`, adapted through `content/work.ts`. Keep new
projects content-driven rather than hardcoding counts. Use the local `$humanizer`
skill for visitor-facing prose. Keep case studies
professional; explainer copy should sound like Kasper. Preserve the approved KS
master artwork across the neon sign, favicon and navigation; mock up proposed
changes on the actual page before changing the mark. Product references to
Claude/Anthropic describe those products; keep their names accurate.

Keep each site variant's existing design; office colours are in `office/theme.ts`.
Reports about app builds must use the Kasper Simonsen Design System at
`C:\dev\Kasper Simonsen Dev DS` after reading its `README.md` and `SKILL.md`:
four house fonts, background `#0B0B0B`, accent `#FF5A1F`, hairlines, real numbers.
That reporting style does not replace a product's own UI styling.

`art/office.blend` is the Blender source (Git LFS).
`scripts/blender/export.py` produces ignored `art/export/*.glb`, then
`npm run build:models` writes `public/models/*.glb`. Validate with
`npm run check:models` and relevant tests. Preserve manifest node names,
hierarchy, transforms, animation, and clean edges; do not flatten, join, simplify,
or quantize models without assessing those contracts. One worker owns Blender
at a time. If another worker imports a shared modelling script, edit a working
copy, verify it, then replace the script in one operation. Use the configured MCP
or a verified local Blender binary.

## Git and records

Preserve user changes and check the current branch instead of switching to one
named in an old plan. Stage explicit files. `public/screenshots/` contains
unblurred client screenshots: never commit or publish it. Reviewed site images
belong in `public/reel/`. Pushes and deployments need current user authorization.
Keep LF line endings.

Codex skills live in `.agents/skills/`; these project skills are intended to be
versioned. Keep machine-local state and nested vendor `.git/` directories out
of the repository.

When a unit of work lands, use the `source-command-work-log` skill and write an
attributed entry. While the preservation hold is active, use `.codex/work/`
and record the temporary location; do not create or modify files in `.claude/`.
After the user lifts that hold, the existing consumers use `.claude/work/`.
Read the canonical work-entry format linked by the skill (on this machine,
`C:\dev\claude-config\references\work-entry.md`). Record the human from
`git config user.email`, the actual agent, and only verified work/references.
Never rewrite existing entries or LOG history. Report missing tracking/log tooling.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Session continuity and inherited hook behavior

Read the newest project handoff, if one exists, before resuming related work.
The SessionStart hook points to it without writing to the legacy directories.
Use relevant installed workflow skills at the start of work. Track task status
and commit strategy explicitly; inherited tool-name hook matchers do not enforce
Codex actions. Review changes and verify them before completion. After editing
JSON-LD, run the installed SEO schema validator or validate against Schema.org.
Use 1Password runtime injection; legacy environment-mount hooks do not enforce
this on Windows. Do not run inherited global configuration sync hooks: they can
modify preserved files and push another repository.
