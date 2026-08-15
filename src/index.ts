/**
 * dsh-skillmanager host entry: mounts read-only skill registry routes plus a
 * toggle endpoint that flips a skill's frontmatter invocation policy on disk.
 * Creation/editing of skill bodies is deliberately left to the host agent
 * (delegated via generated prompts) — the manager inspects and toggles.
 */
import type { Context } from '@deepseek-ai/cordis'
import { mountSkillManagerRoutes, type SkillManagerHost } from './routes.ts'

export const name = 'dsh-skillmanager'

/** Minimal host-plane systemPrompt service face (avoids a hard dep on @deepseek-ai/dsh-system-prompt). */
interface SystemPromptFace {
  section(section: { name: string; order: number; text: string }): () => void
}

export function apply(ctx: Context): void {
  ctx.inject(['webServer', 'loader'], (hostCtx: Context) => {
    const host = hostCtx as unknown as SkillManagerHost
    host.effect(() => mountSkillManagerRoutes(host), 'dsh-skillmanager: http routes')
  })
  ctx.inject(['systemPrompt'], (sysCtx: Context) => (sysCtx as unknown as { systemPrompt: SystemPromptFace }).systemPrompt.section({
    name: 'plugin:dsh-skillmanager',
    order: 900,
    text: 'Installed plugin: dsh-skillmanager (sidebar 技能管理 panel). Lists DHS skills on disk, toggles model/user invocation policy via SKILL.md frontmatter, and delegates skill creation/editing to the agent through generated prompts.',
  }))
}
