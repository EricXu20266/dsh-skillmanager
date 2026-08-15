/**
 * dsh-skillmanager host routes:
 *  - GET  /dsh-skillmanager/list   — ctx.skills.snapshot() summaries
 *  - GET  /dsh-skillmanager/get    — full definition (content/path) by name
 *  - POST /dsh-skillmanager/toggle — flip model/user invocation in SKILL.md frontmatter
 * Skill file edits invalidate the filesystem provider's watch automatically.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import { sendJson, sameOrigin } from './http.ts'

export interface WebServerService {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  }): () => void
}

export interface SkillManagerHost {
  webServer: WebServerService
  effect(callback: () => () => void, label: string): void
}

/** 分组信息：兼容 DHS frontmatter 的 metadata.group/subgroup（泰深式合集） */
export interface SkillGroupInfo {
  name: string
  description: string
  whenToUse?: string
  source: string
  provider: string
  invocation: { modelInvocable: boolean; userInvocable: boolean }
  group?: string
  subgroup?: string
  path?: string
}

interface FrontmatterDoc {
  data: Record<string, unknown>
  content: string
}

/** Parse a SKILL.md-style document: leading --- YAML frontmatter + body.
 *  逐行扫描关闭符（避免正文中整行 --- 误判），与 DHS skill-filesystem 一致。 */
function parseFrontmatter(raw: string): FrontmatterDoc {
  if (!raw.startsWith('---')) return { data: {}, content: raw }
  const lines = raw.split('\n')
  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i
      break
    }
  }
  if (end === -1) return { data: {}, content: raw }
  const yamlText = lines.slice(1, end).join('\n')
  const body = lines.slice(end + 1).join('\n')
  let data: Record<string, unknown> = {}
  try {
    const parsed = yamlLoad(yamlText) as unknown
    if (parsed !== null && typeof parsed === 'object') data = parsed as Record<string, unknown>
  } catch {
    data = {}
  }
  return { data, content: body }
}

/** 按 DHS skill-filesystem 语义读取 invocation 策略（顶层 kebab-case）：
 *  modelInvocable = disable-model-invocation !== true
 *  userInvocable  = user-invocable !== false
 *  兼容旧的嵌套 invocation 对象读取。 */
function readInvocation(data: Record<string, unknown>): { modelInvocable: boolean; userInvocable: boolean } {
  const nested = (data.invocation ?? {}) as Record<string, unknown>
  const dmi = data['disable-model-invocation']
  const ui = data['user-invocable']
  return {
    modelInvocable: typeof dmi === 'boolean' ? !dmi
      : typeof nested.modelInvocable === 'boolean' ? nested.modelInvocable : true,
    userInvocable: typeof ui === 'boolean' ? ui
      : typeof nested.userInvocable === 'boolean' ? nested.userInvocable : true,
  }
}

/** 按 DHS 语义写入 invocation 策略（顶层 kebab-case），并清理旧嵌套 invocation。 */
function writeInvocation(data: Record<string, unknown>, invocation: { modelInvocable: boolean; userInvocable: boolean }): void {
  data['disable-model-invocation'] = !invocation.modelInvocable
  data['user-invocable'] = invocation.userInvocable
  delete data.invocation
}

function renderFrontmatter(doc: FrontmatterDoc): string {
  const dataText = Object.keys(doc.data).length === 0 ? '' : `${yamlDump(doc.data, { lineWidth: -1 })}`
  return dataText === '' ? doc.content : `---\n${dataText}---\n${doc.content}`
}

/** 扫描技能文件系统（user-dsh / user-agents / bundled），解析 frontmatter。
 *  不依赖 ctx.skills 的 provider（web profile 无 preset 时 provider 未加载），
 *  管理以文件系统为准——与泰深 skill-manager 同款做法。 */
function scanSkills(): SkillGroupInfo[] {
  const roots: Array<{ dir: string; source: string }> = [
    { dir: join(homedir(), '.dsh', 'skills'), source: 'user-dsh' },
    { dir: join(process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'), 'skills'), source: 'user-agents' },
  ]
  const bundled = process.env.DSH_BUNDLED_SKILL_DIR
  if (bundled !== undefined && bundled !== '') roots.push({ dir: bundled, source: 'bundled' })

  const out: SkillGroupInfo[] = []
  for (const root of roots) {
    if (!existsSync(root.dir)) continue
    let entries
    try {
      entries = readdirSync(root.dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const skillDir = join(root.dir, entry.name)
      const skillFile = join(skillDir, 'SKILL.md')
      if (!existsSync(skillFile)) continue
      try {
        const raw = readFileSync(skillFile, 'utf8')
        const doc = parseFrontmatter(raw)
        const meta = (doc.data.metadata ?? {}) as Record<string, unknown>
        out.push({
          name: typeof doc.data.name === 'string' ? doc.data.name : entry.name,
          description: typeof doc.data.description === 'string' ? doc.data.description : '',
          whenToUse: typeof doc.data.whenToUse === 'string' ? doc.data.whenToUse : undefined,
          invocation: readInvocation(doc.data),
          source: root.source,
          provider: 'skill-filesystem',
          group: typeof meta.group === 'string' ? meta.group : undefined,
          subgroup: typeof meta.subgroup === 'string' ? meta.subgroup : undefined,
          path: skillFile,
        })
      } catch {
        // 单个技能解析失败跳过
      }
    }
  }
  return out
}

function findSkill(name: string): SkillGroupInfo | undefined {
  return scanSkills().find((s) => s.name === name)
}

export function mountSkillManagerRoutes(host: SkillManagerHost): () => void {
  const disposers = [
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/list',
      handler: async (_request, response) => {
        try {
          sendJson(response, 200, { skills: scanSkills() })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/get',
      handler: async (request, response) => {
        try {
          const url = new URL(request.url ?? '', 'http://localhost')
          const name = url.searchParams.get('name') ?? ''
          if (name === '') {
            sendJson(response, 400, { error: 'name is required' })
            return
          }
          const skill = findSkill(name)
          if (skill === undefined || skill.path === undefined) {
            sendJson(response, 404, { error: `skill "${name}" not found` })
            return
          }
          const raw = readFileSync(skill.path, 'utf8')
          const doc = parseFrontmatter(raw)
          sendJson(response, 200, {
            skill: { ...skill, content: doc.content },
          })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/toggle',
      handler: async (request, response) => {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request rejected' })
          return
        }
        try {
          const url = new URL(request.url ?? '', 'http://localhost')
          const name = url.searchParams.get('name') ?? ''
          const key = url.searchParams.get('key') ?? 'modelInvocable'
          if (name === '' || (key !== 'modelInvocable' && key !== 'userInvocable')) {
            sendJson(response, 400, { error: 'name and key (modelInvocable|userInvocable) are required' })
            return
          }
          const skill = findSkill(name)
          if (skill === undefined || skill.path === undefined) {
            sendJson(response, 404, { error: `skill "${name}" is not file-backed` })
            return
          }
          const raw = readFileSync(skill.path, 'utf8')
          const doc = parseFrontmatter(raw)
          const invocation = readInvocation(doc.data)
          invocation[key] = !invocation[key]
          writeInvocation(doc.data, invocation)
          writeFileSync(skill.path, renderFrontmatter(doc))
          sendJson(response, 200, { ok: true, name, key, value: invocation[key], path: skill.path })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    // 合集管理：设置/清除技能的 group 与 subgroup（写入 frontmatter metadata，DHS 原生读取）
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/group',
      handler: async (request, response) => {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request rejected' })
          return
        }
        try {
          const chunks: Buffer[] = []
          for await (const c of request) chunks.push(c as Buffer)
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
            name?: string; group?: string | null; subgroup?: string | null
          }
          if (body.name === undefined) {
            sendJson(response, 400, { error: 'name is required' })
            return
          }
          const skill = findSkill(body.name)
          if (skill === undefined || skill.path === undefined) {
            sendJson(response, 404, { error: `skill "${body.name}" is not file-backed` })
            return
          }
          const raw = readFileSync(skill.path, 'utf8')
          const doc = parseFrontmatter(raw)
          const metadata = (doc.data.metadata ?? {}) as Record<string, unknown>
          if (body.group === null || body.group === '') delete metadata.group
          else if (typeof body.group === 'string') metadata.group = body.group
          if (body.subgroup === null || body.subgroup === '') delete metadata.subgroup
          else if (typeof body.subgroup === 'string') metadata.subgroup = body.subgroup
          doc.data.metadata = metadata
          writeFileSync(skill.path, renderFrontmatter(doc))
          sendJson(response, 200, { ok: true, name: body.name, metadata })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}
