# Codex migration

## Scope and preservation

Migration branch: `chore/codex-migration`. No push or deployment is authorized.
The inventory was reported before repository changes. `CLAUDE.md`, `.claude/`,
`~/.claude/`, plans and original conversations are preserved. Secret values and
authenticated share links are excluded from the migration and history.

The checkout already contained modified `.gitignore`, `AGENTS.md`, `CLAUDE.md`,
`README.md`, `package.json`, and `scripts/generate-v2-textures.py`, plus untracked
`.agents/`, `docs/codex.md`, and `scripts/sync-agent-instructions.mjs`.
This task reconciles the requested AGENTS and humanizer targets. Unrelated pending
edits remain outside the commit. Only the new local-instructions ignore rule is
staged from `.gitignore`; its earlier changes remain pending.

The pending sync script and setup note remain untouched. Their generation
workflow is superseded for Codex: running `agents:sync` would erase the adaptations.
Edit `AGENTS.md` directly; do not modify the preserved source to resolve drift.

## Inventory and mappings

| Item | Source path | Codex target or disposition |
|---|---|---|
| Root instructions | `CLAUDE.md` | Merged without duplication in root `AGENTS.md`; original untouched |
| Subdirectory/local instructions | None outside dependencies/generated directories | No nested conversion; ignore `**/AGENTS.local.md` and read it explicitly if present |
| Project settings | `.claude/settings.local.json` | `.codex/config.toml` defaults; exact permission inventory below |
| Other settings | `.claude/settings.json` absent | No project env, model, hook, plugin or MCP entries |
| Skill | `.claude/skills/humanizer/` | `.agents/skills/humanizer/{SKILL.md,README.md,WARP.md,LICENSE}` |
| Commands/subagents | `.claude/commands/`, `.claude/agents/` absent | No project command skills or `.codex/agents/*.toml` needed |
| Project MCP/plugin manifest | `.mcp.json`, `.claude-plugin/` absent | Reuse existing host/plugins; no duplicate transport tables |
| Global settings/MCP | `~/.claude/settings.json`, `~/.claude.json` | Read-only inventory; inherited capabilities mapped below |
| Original work entries/Git backup | `.claude/work/` (2 entries), `.claude/humanizer-git-backup/` | Preserve; never vendor backup objects/hooks |
| Transcript root | `~/.claude/projects/C--dev-KasperSimonsen-dev/` | `docs/agent-history.md`, metadata-only `docs/agent-history-sources.json` |
| Alternate history paths | All Claude project transcript directories scanned for matching `cwd` | No additional matches; nested scene/dependency paths belong to the same sessions |
| Agent memories | Project history `memory/*.md` (11 files) | Useful context distilled; missing source sessions flagged |
| Working documents | `.superpowers/` (67 Markdown files) | Preserve ignored working documents; history retains useful findings |
| Dated audits | `ACTION-PLAN.md`, `FULL-AUDIT-REPORT.md` | Preserve as SEO references, not current verified scores |
| Existing references | `docs/` inventory below | Preserve briefs/specs/plans and historical attributions |

## Instructions, skills and agents

`AGENTS.md` retains the installed Next.js warning, project layout, npm commands,
task board, secrets policy, model contracts, design-system boundaries and Git
rules. It removes the generated-file claim, directs edits to itself and links to
history. No instruction `@path` imports existed. Active slash-command references
use the available skill name. Product references to Claude/Anthropic remain facts.

Humanizer's upstream frontmatter, editing body and MIT license are preserved.
Support documents use `.agents/` and `$humanizer`. The header's `version`,
`compatibility` and legacy `allowed-tools` are retained; that allowlist does not
enforce Codex permissions. Reading, editing, searching and writing use host tools.

No project commands used `$ARGUMENTS` or positional parameters, and no project
subagent model/tool restrictions existed. Third-party commands and agents remain
owned by installed Codex equivalents; unsupported parts are listed below.

## MCP servers

No repository server declaration existed to translate into
`[mcp_servers.<name>]`. Three matching project entries in `~/.claude.json`
(forward-slash, lowercase and backslash path spellings) have empty `mcpServers`.
Project overrides would duplicate or replace already-authenticated host servers.

| Service | Claude source | Existing Codex target / prerequisite |
|---|---|---|
| monday | Global stdio registry, `monday_token` | Host `monday`, OAuth configured; no callable tools in this session |
| Blender | Global stdio registry and local bridge | Host `blender`; Blender and bridge must be running |
| 1Password | Plugin `.mcp.json` | Existing host/plugin `1password`; account/app sign-in |
| Supabase | Plugin `agents/claude/.mcp.json` | Existing host/plugin `supabase`; OAuth configured |
| Vercel | Historical connector | Host `vercel`; OAuth configured |
| OpenAI docs | Earlier Codex setup | Host `openaiDeveloperDocs`; no application credentials |
| NetBird | Global registry; `NETBIRD_API_TOKEN`, `NETBIRD_API_HOST`, `SSL_CERT_FILE` | Existing host `netbird`; unrelated service unchanged |
| Square | Global registry via `op`; `SANDBOX`, `DISALLOW_WRITES` | Existing host `square`; its runtime Environment unchanged |
| ATO | Global registry | Existing host `ato`; OAuth configured; unchanged |
| Browser | Claude-in-Chrome connector | Installed Codex browser/computer-use capabilities; browser state not migrated |

`codex mcp list --json` lists these host servers as enabled. OAuth labels are
configuration evidence, not live API permission checks. `unsupported` on local
servers describes the auth method, not a failed server. `codex_app` and `cua_repl`
are configured but disabled; `node_repl` is enabled. None is changed here.

No literal `${NAME}` secret values are emitted as TOML: they would not provide
runtime interpolation. For a future stdio server, forward names with `env_vars`
and inject values through 1Password. HTTP supports `bearer_token_env_var` or
`env_http_headers`. Do not copy values from legacy global registries.
See [MCP setup](https://learn.chatgpt.com/docs/extend/mcp) and the
[configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

## Settings and permissions

The project config uses `approval_policy = "on-request"` and
`sandbox_mode = "workspace-write"`, with network access enabled for package/tool
workflows. These define a practical project boundary; they cannot translate each
Claude command/path/tool rule. Managed policy and invocation/session overrides
take precedence. This session's host-supplied never-approval/full-access policy
is not changed retroactively by writing the file.

Project settings contain only `permissions.allow`: no deny/ask list, env, model,
hooks or MCP. The decoded rules are recorded in the appendix, with one inline
env assignment value redacted as required. They are historical evidence, not
executable permissions or new authorization for `git push`, deletion or taskkill.
Outside-workspace reads need host authorization/additional directories as applicable.

Inherited global names also inventoried: `env`
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, name only), `skillOverrides`, `statusLine`,
`modelSettings`, `tui`, `voice`, `autoMemoryEnabled`,
`skipDangerousModePermissionPrompt`, `skipWorkflowUsageWarning`,
`agentPushNotifEnabled`, `autoMode`, `voiceEnabled`, `enabledPlugins`,
`extraKnownMarketplaces`, `hooks`. They are other-agent host settings; no model
mapping, secret export or safety bypass is inferred.

## Hooks

Installed CLI: `codex-cli 0.162.1`. It supports inline hook tables and the relevant
lifecycle events. The handoff notice is ported to `.codex/hooks/session-start.mjs`
and registered in `.codex/config.toml`. Its command resolves from the Git root,
including when launched from a subdirectory. It points to migration/history and
the latest handoff in `.codex/handoffs/` or the preserved global handoff folder.
It creates no directories and performs no Git mutations.

After restart, the user reviews and trusts the concrete definition in `/hooks`.
The migration does not bypass hook trust. AGENTS also states the behavior so
skipping an untrusted hook does not lose continuity guidance.
See [Codex hooks](https://learn.chatgpt.com/docs/hooks).

| Original behavior | Mapping |
|---|---|
| Global SessionStart `handoff.sh notice` | Read-only project hook and explicit AGENTS continuity instruction |
| SessionStart `C:/Dev/claude-config/session-hook.ps1` | Unmapped auto-fetch/pull/config sync: modifies preserved files; do not invoke |
| SessionEnd `C:/Dev/claude-config/session-end-hook.ps1` | Unmapped auto-commit/push: conflicts with preservation and no-push scope |
| Superpowers startup skill injection | Installed Codex skills; explicit instruction to use relevant workflows |
| Extended Superpowers TaskCreate/Agent/AskUserQuestion gates | Tool-name enforcement unmapped; explicit task status, commit strategy, review and verification instructions |
| Codex companion lifecycle/Stop review | Disabled Codex plugin; native review/delegation replaces purpose, not bridge state |
| Ralph Stop continuation | Disabled Codex plugin; transcript/state-dependent continuation unmapped |
| SEO PostToolUse Edit/Write schema validator | Installed SEO skills and explicit JSON-LD validation instruction; matcher enforcement not claimed |
| Shopify Skill/Read/prompt telemetry | Existing plugin owns instrumentation; no duplicate repo hook; matcher parity unverified |
| 1Password Bash mount validation | Existing plugin and explicit runtime-injection rule; Windows mount behavior not equivalent |

Hooks combine across active layers; project config cannot disable inherited hooks
by omission. Review `/hooks` before trusting a hook that writes Claude state or
publishes configuration. Legacy scripts were inspected, not executed; global
hook configuration remains unchanged.

## Unmapped

| Item | Reason and retained behavior |
|---|---|
| Individual Claude permission patterns | Sandbox/approval settings are not tool/command/path allowlists; exact rules retained in appendix |
| Humanizer tool/compatibility header | Preserved upstream header; permissions remain controlled by Codex host |
| Global auto-sync/auto-push hooks | Events exist, but source scripts modify protected state and can push another repo; never enabled here |
| Extended Superpowers gates | Legacy tool names/task state lack direct Codex equivalents; installed skills and explicit workflow guidance retained |
| SEO subagent roles/schema matcher | Skills exist; native TOML role discovery and Edit/Write hook enforcement not verified; use skills and schema validation |
| Companion rescue agent/lifecycle | Installed but disabled Claude-to-Codex bridge; native review/resume/delegation does not import its state |
| Ralph loop lifecycle | Installed but disabled; legacy Stop script reads Claude transcript/state; not represented as an ordinary skill |
| `claude-seo@agricidaniel-seo` | Enabled registration has no local source; likely duplicate of the available SEO registration, exact old behavior unknown |
| `cc-plugin-you-should-know@builtin` | Enabled built-in registration has no inspectable local source; precise behavior unknown |
| Claude-in-Chrome/Artifact/SendUserFile | Use host browser/artifact capabilities; auth state and old share links not portable |
| Shopify/1Password legacy matchers | Installed equivalents exist; tool matching and Windows mount validation not independently verified |
| Global UI/model/env/auto-memory settings | Other-agent host settings do not map directly; names inventoried, no values/model choices copied |
| Missing older conversations | Only Oct 1–7 transcripts remain; voice/design memories cite absent sessions; history labels memory evidence |
| AGENTS.local.md automatic discovery | None existed; ignored and explicitly read by instructions, not claimed as automatically merged |
| Instruction sync | Pending source script preserved; regeneration conflicts with independent Codex guidance until deliberately redesigned |
| monday tracking | Host configured but no callable tools; board verification, reconciliation, task code/status/Brief/update still need follow-up |
| Work-record location | User forbids .claude writes; attributed entries temporarily in .codex/work pending later reconciliation |

## Manual steps

1. Restart Codex here. Trust the project config when appropriate; review the
   read-only notice in `/hooks`, check `$humanizer` and `/mcp`.
2. Restore callable monday tools; verify board `5102421912` in workspace `5217812`,
   reconcile additively and allocate the actual next `KSDEV-n`. Attach this
   migration's real commit. No task code was invented.
3. Reauthenticate only when needed: `codex mcp login monday`, `vercel` or
   `supabase`. Local Blender and 1Password use app/bridge prerequisites.
4. Resolve `kaspersimonsen-dev` in 1Password. Runtime names: `RESEND_API_KEY`,
   `GITHUB_TOKEN`, optional `GITHUB_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SECRET`,
   optional `GEMINI_API_KEY`. Use `op run --environment <resolved-id> -- npm.cmd
   run dev` / `build`. The earlier setup note's missing-name list is historical.
   Legacy ignored `.env.local` and global registries remain untouched; their
   values are not part of this migration.
5. On another machine, install listed Codex plugin equivalents rather than copying
   credential-bearing global config. Review hook trust and command/role support.
6. The Vercel CLI is not installed. Strongly recommended: `npm i -g vercel` for
   `vercel logs` and authorized `vercel deploy`. It also provides `vercel env pull`,
   but this repo requires secrets in 1Password: do not write an env file with it.
7. After explicit confirmation, reconcile temporary work entries and decide how
   to retire the old sync workflow. No original removal is part of this commit.

## Verification

Actual verification results are appended below. This migration changes guidance,
configuration and documentation. It does not change app code or models; browser
tests and a credential-dependent production build are not used as proof of this
migration. Historical tests are not reported as current passing checks.

## Plugin component inventory

Sources are relative to ~/.claude/plugins/cache/. Existing Codex equivalents
are reused rather than vendored. Enabled state was verified with codex plugin
list --json. Installed does not prove legacy hooks/roles are compatible.

| Registration | Local source and parts | Codex target |
|---|---|---|
| `superpowers@claude-plugins-official` | `claude-plugins-official/superpowers/6.4.1`; skills: `brainstorming`, `diagnosing-superpowers`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`; hook events: SessionStart | `superpowers@claude-plugins-official`, version `6.4.1`, enabled |
| `superpowers-extended-cc@superpowers-extended-cc-marketplace` | `superpowers-extended-cc-marketplace/superpowers-extended-cc/6.4.3-dev`; skills: `brainstorming`, `checking-gates`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `specifying-gates`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`; commands: `brainstorm`, `execute-plan`, `gate-check`, `onboard`, `specify-gate`, `write-plan`; hook events: SessionStart, PreToolUse | `superpowers-extended-cc@superpowers-extended-cc-marketplace`, version `6.5.3-dev`, enabled; command skills use the installed migration when provided |
| `supabase@claude-plugins-official` | `claude-plugins-official/supabase/0.1.15`; skills: `supabase`, `supabase-postgres-best-practices`; MCP: supabase; agents/ folders are client configurations, not subagent roles | `supabase@claude-plugins-official`, version `0.1.15`, enabled |
| `codex@openai-codex` | `openai-codex/codex/1.0.6`; skills: `codex-cli-runtime`, `codex-result-handling`, `gpt-5-4-prompting`; commands: `adversarial-review`, `cancel`, `rescue`, `result`, `review`, `setup`, `status`, `transfer`; agents: `codex-rescue`; hook events: SessionStart, SessionEnd, Stop | `codex@openai-codex`, version `1.0.6`, disabled; command skills use the installed migration when provided; legacy role enforcement/discovery remains Unmapped |
| `frontend-design@claude-plugins-official` | `claude-plugins-official/frontend-design/315c4e48967d`; skills: `frontend-design` | `frontend-design@claude-plugins-official`, version `local`, enabled |
| `claude-seo@agricidaniel-seo` | Local source unavailable | Unmapped |
| `claude-md-management@claude-plugins-official` | `claude-plugins-official/claude-md-management/1.0.0`; skills: `claude-md-improver`; commands: `revise-claude-md` | `claude-md-management@claude-plugins-official`, version `1.0.0`, enabled; command skills use the installed migration when provided |
| `pac-docs@pac-plugins` | `pac-plugins/pac-docs/1.7.1`; skills: `commission-pack`, `pac-quote`, `pac-tech-docs` | `pac-docs@pac-plugins`, version `1.7.1`, enabled |
| `ralph-loop@claude-plugins-official` | `claude-plugins-official/ralph-loop/1.0.0`; commands: `cancel-ralph`, `help`, `ralph-loop`; hook events: Stop | `ralph-loop@claude-plugins-official`, version `1.0.0`, disabled; command skills use the installed migration when provided |
| `claude-seo@agricidaniel-claude-seo` | `agricidaniel-claude-seo/claude-seo/2.2.5`; skills: `seo`, `seo-audit`, `seo-backlinks`, `seo-cluster`, `seo-competitor-pages`, `seo-content`, `seo-content-brief`, `seo-dataforseo`, `seo-drift`, `seo-ecommerce`, `seo-flow`, `seo-geo`, `seo-google`, `seo-hreflang`, `seo-image-gen`, `seo-images`, `seo-local`, `seo-maps`, `seo-page`, `seo-plan`, `seo-programmatic`, `seo-schema`, `seo-sitemap`, `seo-sxo`, `seo-technical`; agents: `seo-backlinks`, `seo-cluster`, `seo-content`, `seo-dataforseo`, `seo-drift`, `seo-ecommerce`, `seo-flow`, `seo-geo`, `seo-google`, `seo-image-gen`, `seo-local`, `seo-maps`, `seo-performance`, `seo-schema`, `seo-sitemap`, `seo-sxo`, `seo-technical`, `seo-visual`; hook events: PostToolUse | `claude-seo@agricidaniel-claude-seo`, version `2.4.2`, enabled; legacy role enforcement/discovery remains Unmapped |
| `shopify-ai-toolkit@claude-plugins-official` | `claude-plugins-official/shopify-ai-toolkit/1.8.4`; skills: `shopify-admin`, `shopify-app-pricing`, `shopify-app-store-review`, `shopify-custom-data`, `shopify-customer`, `shopify-dev`, `shopify-functions`, `shopify-hydrogen`, `shopify-liquid`, `shopify-onboarding-dev`, `shopify-onboarding-merchant`, `shopify-partner`, `shopify-payments-apps`, `shopify-polaris-admin-extensions`, `shopify-polaris-app-home`, `shopify-polaris-checkout-extensions`, `shopify-polaris-customer-account-extensions`, `shopify-pos-ui`, `shopify-shopifyql`, `shopify-storefront-graphql`, `shopify-use-shopify-cli`, `ucp`; hook events: PostToolUse, UserPromptSubmit | `shopify-ai-toolkit@claude-plugins-official`, version `1.8.4`, enabled |
| `1password@1password` | `1password/1password/0.1.0`; skills: `1password-environments`; hook events: PreToolUse; MCP: 1password | `1password@1password`, version `0.1.0`, enabled |
| `cc-plugin-you-should-know@builtin` | Local source unavailable | Unmapped |

Disabled Claude registrations: ui-ux-pro-max@ui-ux-pro-max-skill,
vercel@claude-plugins-official, claude-blog@agricidaniel-blog. No global plugin
state was changed. Their independently installed Codex capabilities remain.

## Exact project permission inventory

Only the inline RESEND_API_KEY assignment value is redacted. All other strings
are the original decoded rules, retained as evidence rather than authority.

```json
{
  "allow": [
    "Bash(npx create-next-app@latest . --typescript --tailwind --app --no-eslint --no-src-dir --import-alias \"@/*\" --yes)",
    "Read(//c/dev/**)",
    "Bash(npx create-next-app@latest kasper-portfolio --typescript --tailwind --app --no-eslint --no-src-dir --import-alias \"@/*\" --yes)",
    "Bash(cp -r kasper-portfolio/. KasperSimonsen.dev/)",
    "Bash(rm -rf kasper-portfolio)",
    "Bash(npm run *)",
    "Bash(node -e ' *)",
    "Read(//tmp/**)",
    "Bash(taskkill *)",
    "Bash(curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3002/)",
    "Bash(netstat -ano)",
    "Bash(awk '{print $5}')",
    "Bash(xargs -I{} taskkill /PID {} /F)",
    "Bash(rm -rf .next)",
    "Bash(findstr \"LISTENING\")",
    "Bash(findstr \":30\")",
    "Bash(npx tsc *)",
    "Bash(git init *)",
    "Bash(git remote *)",
    "Bash(git add *)",
    "Bash(git commit *)",
    "Bash(git push *)",
    "Bash(git -C C:/dev/KasperSimonsen.dev add app/work-with-me/page.tsx app/contact/ContactForm.tsx)",
    "Bash(git -C C:/dev/KasperSimonsen.dev status)",
    "Bash(git *)",
    "Skill(humanizer)",
    "Bash(python -c \"from PIL import Image; img = Image.open\\('C:/dev/KasperSimonsen.dev/public/forja-pac-audit.png'\\); print\\(img.size\\)\")",
    "Bash(python3 -c \"from PIL import Image; img = Image.open\\('C:/dev/KasperSimonsen.dev/public/forja-pac-audit.png'\\); print\\(img.size\\)\")",
    "Bash(awk '{print $5, $9}')",
    "PowerShell(Get-Process chrome | Where-Object { $_.MainWindowTitle -ne \"\" } | Select-Object Id, MainWindowTitle, MainWindowHandle | Format-Table -AutoSize)",
    "WebFetch(domain:www.pac-technologies.com.au)",
    "Bash(curl -sSL -o /tmp/silio-dashboard.png \"https://www.pac-technologies.com.au/assets/silio-dashboard.png\" -w \"dashboard: %{http_code} %{size_download} bytes\\\\n\")",
    "Bash(curl -sSL -o /tmp/silio-batch.png \"https://www.pac-technologies.com.au/assets/silio-batch.png\" -w \"batch: %{http_code} %{size_download} bytes\\\\n\")",
    "PowerShell(Get-Item *)",
    "WebFetch(domain:styles.refero.design)",
    "mcp__monday__search",
    "mcp__monday__create_board",
    "mcp__monday__get_board_info",
    "mcp__monday__create_group",
    "mcp__monday__create_column",
    "mcp__monday__create_item",
    "Skill(nano-banana)",
    "PowerShell(Test-Path *)",
    "PowerShell(try { \\(Get-Command python -ErrorAction Stop\\).Source; python --version } catch { \"no-python\" }; if \\($env:GEMINI_API_KEY\\) { \"GEMINI_API_KEY set\" } else { \"GEMINI_API_KEY missing\" })",
    "PowerShell($u=[Environment]::GetEnvironmentVariable\\('GEMINI_API_KEY','User'\\); $m=[Environment]::GetEnvironmentVariable\\('GEMINI_API_KEY','Machine'\\); if\\($u\\){\"user-level set\"}elseif\\($m\\){\"machine-level set\"}else{\"absent everywhere\"}; $g=[Environment]::GetEnvironmentVariable\\('GOOGLE_API_KEY','User'\\); if\\($g\\){\"GOOGLE_API_KEY user-level set\"}else{\"GOOGLE_API_KEY absent\"})",
    "PowerShell(New-Item *)",
    "PowerShell(npm run *)",
    "PowerShell(Remove-Item *)",
    "PowerShell($env:RESEND_API_KEY='<REDACTED: env value>'; npx next dev --port 3041)",
    "mcp__monday__create_update",
    "mcp__monday__change_item_column_values",
    "mcp__monday__all_monday_api",
    "PowerShell($u=[Environment]::GetEnvironmentVariable\\('GEMINI_API_KEY','User'\\); if\\($u\\){\"user-level set\"}else{\"absent\"})"
  ]
}
```

## Original repository reference documents

- `docs/admin-portal-spec.md`
- `docs/codex.md`
- `docs/kaspersimonsen-dev-build-brief.md`
- `docs/kaspersimonsen-work-page-prompt.md`
- `docs/kaspersimonsen-work-with-me-prompt.md`
- `docs/manuva-brief.md`
- `docs/superpowers/plans/2026-10-01-office-phase-1-foundation.md`
- `docs/superpowers/plans/2026-10-01-office-phase-1-foundation.rulings.md`
- `docs/superpowers/plans/2026-10-02-office-interactions-m1.md`
- `docs/superpowers/plans/2026-10-02-office-interactions-m2.md`
- `docs/superpowers/plans/2026-10-02-office-phase-3-interactions.md`
- `docs/superpowers/plans/2026-10-04-office-interactions-m3.md`
- `docs/superpowers/plans/2026-10-05-office-monitor-fullscreen.md`
- `docs/superpowers/plans/2026-10-05-office-monitor-reel.md`
- `docs/superpowers/plans/2026-10-05-office-whiteboard.md`
- `docs/superpowers/plans/2026-10-06-office-reel-sharp-controls.md`
- `docs/superpowers/plans/2026-10-07-office-neon-sign.md`
- `docs/superpowers/specs/2026-10-01-office-redesign-design.md`
- `docs/superpowers/specs/2026-10-02-office-interactions-design.md`
- `docs/superpowers/specs/2026-10-05-office-whiteboard-design.md`
- `docs/superpowers/specs/2026-10-07-office-neon-sign-design.md`

## Original ignored working documents

- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/progress.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-1-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-10-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-11-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-12-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-2-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-3-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-4-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-5-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-6-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-7-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-8-brief.md`
- `.superpowers/sdd/2026-10-01-office-phase-1-foundation/task-9-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/progress.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-1-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-2-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-3-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-4-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-5-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-6-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-7-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m1/task-8-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/content-drafts.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/final-review.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/progress.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-1-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-10-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-11-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-12-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-2-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-3-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-4-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-5-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-6-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-8-brief.md`
- `.superpowers/sdd/2026-10-02-office-interactions-m2/task-9-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/progress.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-1-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-10-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-2-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-3-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-4-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-5-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-6-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-7-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-8-brief.md`
- `.superpowers/sdd/2026-10-02-office-phase-3-interactions/task-9-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/final-fix-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/final-fix-report.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/global-constraints.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/implementer-rules.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/progress.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/reviewer-instructions.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/slides-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/slides-report.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-1-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-1-report.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-2-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-2-report.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-3-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-3-report.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-4-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-4-report.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-5-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-5-report.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-6-brief.md`
- `.superpowers/sdd/2026-10-05-office-monitor-reel/task-6-report.md`

## Original memory inventory

- `feedback_atomic_module_swaps.md`
- `feedback_design_references.md`
- `feedback_logo_is_canonical.md`
- `feedback_mockup_choices.md`
- `feedback_one_headless_browser.md`
- `feedback_voice_samples.md`
- `MEMORY.md`
- `project_office_redesign.md`
- `reference_image_generation.md`
- `user_review_env.md`
- `user_voice.md`

## Verification results

- Python TOML parsing passed.
- Codex 0.162.1 app-server with `--strict-config` accepted `config/read` for
  both the repo root and `office/`, detected the active project layer and returned
  the intended on-request/workspace-write policy.
- `skills/list` detected repo-scope `humanizer`, enabled, with zero discovery
  errors. Upstream SKILL.md frontmatter/body match the original; the license
  content matches with LF normalization.
- `hooks/list` detected the project SessionStart command, with zero discovery
  errors and `trustStatus = untrusted`, as expected. The hook was manually
  exercised from root and `office/`; both emitted valid context JSON.
- `codex mcp list --json` and `codex plugin list --json` succeeded. The configured
  servers and installed equivalents are listed above. No live monday tool was
  exposed, so board/task updates remain outstanding.
- History source index contains all 130 files and zero malformed JSON records.
- Local Markdown links and skill support paths passed inspection. New text uses
  LF. A scan against the existing env secret values and share-token patterns
  passed without printing any values.
- Hash comparison confirms protected repo originals and the inventoried global
  settings/plugin registry are unchanged. Unrelated pending files match their
  task-start snapshots.
- `--strict-config` is not accepted by the `mcp` subcommand in this version;
  strict project validation used the app-server's supported flag instead.
- Git whitespace and staged-scope checks are performed before committing. No
  app/browser/build result is claimed for this configuration-only migration.
