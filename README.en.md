# dsh-skillmanager

> 🌐 **English | [中文](README.md)**

DSH Skill Manager — a graphical tool for viewing and managing DHS skills: list, grouping, enable/disable, guided creation, and LLM review. Skill creation and editing are executed by the host agent (LLM); this plugin handles "see clearly, control firmly".

## How DHS manages skills (background)

DHS's skill system has **no centralized registry — files are the registry**: drop `<name>/SKILL.md` into a scan root and the host automatically discovers it and adds it to the model's available directory.

### Scan directories (skill-filesystem provider default roots)

| Directory | Source tag | Description |
|---|---|---|
| `~/.dsh/skills` | user-dsh | DHS's own skill directory |
| `~/.agents/skills` | user-agents | **Agent Skills open-spec** shared directory (adopted by Claude Code, Codex, Cursor and many other tools) — skills are reusable across tools |
| `<project root>/.dsh/skills` | project-dsh | Project-level, DHS-specific |
| `<project root>/.agents/skills` | project-agents | Project-level, shared |
| `$DSH_BUNDLED_SKILL_DIR` | bundled | Built-in skills (optional) |

> `~/.agents` is the shared config root of Anthropic's Agent Skills open specification (not Claude Code's `~/.claude`). DHS proactively supports it — any skill placed in `~/.agents/skills` works in any compatible tool.

### Invocation (two channels)

1. **Model-driven**: each session injects an `<available_skills>` directory (skill name + 500-char truncated description); the model loads the full instructions with the `skill` tool
2. **User-driven**: type `/<skill-name>` (kebab-case) in the conversation and the host injects the full skill instructions into context

### Permission switches (frontmatter)

| frontmatter | Model invocation | User slash command |
|---|---|---|
| (default) | ✅ | ✅ |
| `disable-model-invocation: true` | ❌ | ✅ (only entry) |
| `user-invocable: false` | ✅ | ❌ |

### Prerequisites

For a skill to be usable, the session must mount the `skill-filesystem` + `tool-skill` plugins — the web profile's default preset `standard` already mounts them; the `minimal` preset has only two tools and no skill capability.

## What this plugin does: graphical management

DHS natively offers only "filesystem + session injection" for skills, which is hard to view and manage visually. This plugin provides a "Skill Manager" panel in the sidebar:

- **Skill list**: scans the filesystem (`~/.dsh/skills`, `~/.agents/skills`, `$DSH_BUNDLED_SKILL_DIR`) and parses SKILL.md frontmatter — **independent of whether the preset loads the provider**; management is filesystem-based (visible in the panel = file is on disk)
- **Three views**: All / by source (user-dsh, user-agents, project, bundled) / by collection (metadata.group + subgroup)
- **Two toggles**: "Model can invoke" and "User can invoke" switch independently (writes frontmatter, read natively by DHS)
- **Collection management**: set/clear group/subgroup, enable/disable an entire group at once
- **Details**: trigger conditions, body preview, file path
- **Create skill**: guides DHS to create `~/.dsh/skills/<name>/` (the LLM writes SKILL.md from a prompt)
- **LLM review**: one-click generation of a review prompt for DHS (instruction quality / security risk / improvement suggestions); edit the file directly when changes are needed
- **i18n**: zh / en bilingual

## Install

```sh
# From GitHub (first install requires allowing the build; dsh will prompt you to add the package key to the profile's pnpm-workspace.yaml allowBuilds)
dsh plugin add github:EricXu20266/dsh-skillmanager

# Or from npm (prebuilt artifacts, no build authorization needed)
dsh plugin add dsh-skillmanager
```

## Usage

After installing, restart the dsh session and the "Skill Manager" entry appears in the sidebar. After adding/modifying skill files, the watcher discovers them automatically — no restart needed.

## Development

```sh
pnpm install
pnpm build          # tsc compiles host side → lib/
pnpm bundle:client  # tsdown bundles client side → client/client.js
```

> During development, if the profile references this repo via a `file:` dependency, you must manually sync build artifacts into the profile's node_modules after changes (pnpm `file:` deps are copied once and don't watch source changes), then restart the host.

## License

MIT
