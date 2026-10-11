# WARP.md

This is Warp guidance for the migrated skill. For Codex, the project entrypoint is
`SKILL.md`; use `$humanizer` and see the Codex section in `README.md`.

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## What this repo is
This directory contains a writing skill for Codex and OpenCode,
implemented entirely as Markdown.

The runtime artifact is `SKILL.md`: the agent reads the YAML metadata and the
editing instructions that follow. Tool availability is managed by the host.

`README.md` is for humans: installation, usage, and a compact overview of the patterns.

## Key files (and how they relate)
- `SKILL.md`
  - The actual skill definition.
  - Starts with YAML frontmatter (`---` … `---`) containing `name`, `description`,
    `license`, and the preserved upstream version and compatibility metadata.
  - After the frontmatter is the editor prompt: the canonical, detailed pattern list with examples.
- `README.md`
  - Installation and usage instructions.
  - Contains a summarized “29 patterns” table and a short version history.

When changing behavior/content, treat `SKILL.md` as the source of truth, and update `README.md` to stay consistent.

## Common commands
### Use the project skill in Codex

Invoke `$humanizer`, or ask Codex to humanize text. The parent repository includes
this directory at `.agents/skills/humanizer/`; no clone or extra install is needed.

### Install the skill into Codex
Recommended (clone directly into Codex skills directory):
```bash
mkdir -p ~/.agents/skills
git clone https://github.com/blader/humanizer.git ~/.agents/skills/humanizer
```

Manual install/update (only the skill file):
```bash
mkdir -p ~/.agents/skills/humanizer
cp SKILL.md ~/.agents/skills/humanizer/
```

## How to “run” it (Codex)
Invoke the skill:
- `$humanizer` then paste text

## Making changes safely
### Versioning (keep in sync)
- `SKILL.md` preserves the upstream `version` in its YAML frontmatter.
- `README.md` has a “Version History” section.

If you bump the version, update both.

### Editing `SKILL.md`
- Preserve valid YAML frontmatter formatting and indentation.
- Keep the pattern numbering stable unless you’re intentionally re-numbering (since the README table and examples reference the same numbering).

### Documenting non-obvious fixes
If you change the prompt to handle a tricky failure mode (e.g., a repeated mis-edit or an unexpected tone shift), add a short note to `README.md`’s version history describing what was fixed and why.
