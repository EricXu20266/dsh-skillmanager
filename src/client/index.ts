/**
 * dsh-skillmanager client: sidebar entry + skill list panel.
 * Lists skills from the host registry, toggles invocation policy on disk,
 * and delegates creation/review to the host agent via session prompts.
 */
import { createElement as h, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Translate } from './locales-types.ts'
import { zh, en } from './locales.ts'
import { sourceLabel, SOURCE_ORDER, type SkillInfo, type SkillDetail } from './market-data.ts'

export const name = 'dsh-skillmanager'
export const inject = ['slots', 'locale', 'sessions', 'workspaces']

/* ── inline styles (consistent with dsh-discovery / taishen-style panel) ── */

/* 卡片操作按钮（小） */
const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '4px 12px', boxSizing: 'border-box',
  background: 'var(--dsw-alias-button-elevated-fill, #2a2a4a)', border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
  borderRadius: 8, color: 'var(--dsw-alias-label-primary, #e0e0f0)', font: '500 12px system-ui',
  cursor: 'pointer', transition: 'background-color .15s ease, color .15s ease',
}
const primaryBtn: React.CSSProperties = {
  ...btnStyle, background: '#4176e6', borderColor: '#4176e6', color: '#fff',
}
/* 侧边栏入口按钮（对齐 dsh-discovery） */
const sidebarBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  width: '100%', height: 38, padding: '8px 16px', boxSizing: 'border-box',
  background: 'transparent', border: 'none', borderRadius: 12,
  color: 'var(--dsw-alias-label-primary, #c6c8d4)', font: '500 14px system-ui',
  lineHeight: '22px', cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
  transition: 'background-color .15s ease, color .15s ease, transform .15s ease',
}
const btnHoverStyle: React.CSSProperties = {
  background: 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06))',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)',
}
const railStyle: React.CSSProperties = {
  ...sidebarBtnStyle, justifyContent: 'center', width: 36, height: 36, padding: 0, borderRadius: 8,
  color: 'var(--dsw-alias-label-secondary, #9aa0b4)',
}
/* 面板骨架（对齐 dsh-discovery：mask + 居中大横版） */
const maskStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(8,8,16,.6)', zIndex: 1000 }
const panelStyle: React.CSSProperties = {
  position: 'absolute', inset: '28px 32px', maxWidth: 1180, margin: '0 auto',
  background: 'var(--dsw-alias-bg-layer-1, #14141f)',
  border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)', borderRadius: 16,
  boxShadow: '0 24px 64px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
}
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)', font: '600 15px system-ui', flexShrink: 0,
}
const closeStyle: React.CSSProperties = {
  marginLeft: 'auto', background: 'var(--dsw-alias-button-elevated-fill, #2a2a4a)',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)', border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
  borderRadius: 6, padding: '4px 12px', cursor: 'pointer', font: '12px system-ui',
}
/* 视图切换 tab（对齐 dsh-discovery 分类 pill） */
const catStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary, #9aa0b4)',
  fontSize: 12, padding: '4px 12px', borderRadius: 999, cursor: 'pointer',
  transition: 'background-color .15s ease, color .15s ease',
}
const catOnStyle: React.CSSProperties = {
  ...catStyle, background: 'var(--dsw-alias-bg-layer-2, #2a2a4a)',
  color: 'var(--dsw-alias-brand-primary, #7aa2ff)', fontWeight: 600,
}
/* 列表卡片 */
const itemStyle: React.CSSProperties = {
  background: 'var(--dsw-alias-bg-layer-1, #1a1a2b)',
  border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)', borderRadius: 12, padding: '14px 16px', marginBottom: 10,
}
const nameStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #e0e0f0)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace',
}
const descStyle: React.CSSProperties = {
  fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, #9aa0b4)', marginTop: 6,
}
const metaStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginTop: 6,
}
const badgeStyle: React.CSSProperties = {
  fontSize: 10, padding: '1px 7px', borderRadius: 9, background: 'var(--dsw-alias-bg-layer-2, #2a2a4a)',
  color: 'var(--dsw-alias-brand-primary, #7aa2ff)', border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
}
const groupBadgeStyle: React.CSSProperties = {
  fontSize: 10, padding: '1px 7px', borderRadius: 9, background: 'var(--dsw-alias-bg-layer-2, #2a2a4a)',
  color: 'var(--dsw-alias-label-secondary, #9aa0b4)', border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
}
const toggleStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)', background: 'transparent', borderRadius: 7,
  padding: '3px 9px', fontSize: 11, cursor: 'pointer', color: 'var(--dsw-alias-label-secondary, #9aa0b4)',
}
const toggleOnStyle: React.CSSProperties = { ...toggleStyle, background: 'rgba(26,127,55,.18)', borderColor: '#1a7f37', color: '#3fb96f' }
const toggleOffStyle: React.CSSProperties = { ...toggleStyle, background: 'rgba(255,255,255,.04)', color: '#8b949e' }
const contentStyle: React.CSSProperties = {
  marginTop: 8, padding: 10, background: 'var(--dsw-alias-bg-layer-2, #1c1c2e)', borderRadius: 8,
  border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)', fontSize: 12, color: 'var(--dsw-alias-label-secondary, #c6c8d4)',
  whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto',
}
const emptyStyle: React.CSSProperties = { textAlign: 'center', color: 'var(--dsw-alias-label-secondary, #9aa0b4)', fontSize: 13, padding: 48 }

/* ── session helper (mirrors dsh-discovery) ─────────────────────────────── */

interface DiscoveryClientContext {
  workspaces: { list: { getSnapshot(): { items: Array<{ workspaceId: string; sessionIds: string[] }>; recentWorkspaceId?: string } }; startSession(): void; connectWorkspace(id: string): Promise<string> }
  sessions: { list: { getSnapshot(): { current?: string } }; open(id: string): void; scope(id: string): unknown }
  locale: { register(ns: string, dict: unknown): void; bind(ns: string): Translate }
  slots: { inject(name: string, fn: () => unknown): void; register(spec: unknown, render: (owner: { wide: boolean }) => ReactNode): unknown }
}

async function openSessionAndSend(ctx: DiscoveryClientContext, text: string): Promise<boolean> {
  const ws = ctx.workspaces.list.getSnapshot()
  const current = ctx.sessions.list.getSnapshot().current
  const currentWsId = current === undefined
    ? undefined
    : ws.items.find((item) => item.sessionIds.includes(current))?.workspaceId
  const target = currentWsId ?? ws.recentWorkspaceId
  if (target === undefined) {
    ctx.workspaces.startSession()
    return false
  }
  const sessionId = await ctx.workspaces.connectWorkspace(target)
  ctx.sessions.open(sessionId)
  const scoped = ctx.sessions.scope(sessionId)
  if (scoped === undefined) return false
  const conversation = scoped.get('conversation') as { send(text: string): Promise<void> }
  await conversation.send(text)
  return true
}

/* ── prompts ────────────────────────────────────────────────────────────── */

function buildReviewPrompt(skill: SkillInfo & { path?: string }, t: Translate): string {
  return [
    `请审查本机技能「${skill.name}」（${skill.path ?? skill.provider}）：`,
    '',
    `描述：${skill.description}`,
    skill.whenToUse !== undefined ? `触发时机：${skill.whenToUse}` : '',
    '',
    '审查要点：',
    '1. 指令质量：描述是否清晰、触发条件（whenToUse）是否明确、正文是否与描述一致',
    '2. 安全风险：是否存在提示注入风险、越权指令、敏感操作',
    '3. 改进建议：需要补充/修改哪些内容',
    '',
    '如需修改，直接使用文件工具编辑该技能文件（保留 YAML frontmatter 格式），完成后简述改了什么。',
  ].filter((line) => line !== '').join('\n')
}

function buildCreatePrompt(t: Translate): string {
  return [
    '请在本机技能目录创建一个新技能。',
    '',
    '步骤：',
    '1. 询问用户：技能名称（kebab-case）、一句话描述、触发时机、核心指令内容',
    '2. 创建目录 ~/.dsh/skills/<name>/，写入 SKILL.md（YAML frontmatter：name/description/whenToUse + 正文）',
    '3. 完成后告知路径与如何触发',
    '',
    '注意：技能名必须是小写 kebab-case；正文用 Markdown；不要创建与内置技能重名的技能。',
  ].join('\n')
}

/* ── components ─────────────────────────────────────────────────────────── */

/** Skill 平面图标：闪电字形（能力/技能激活），currentColor 跟随按钮文字色，与 dsh-discovery 图标体系一致。 */
const SKILL_ICON_PATH = 'M9 0.5 L3 8 H6.5 L8 13.5 L13 5.5 H9.5 L9 0.5 Z'

function SkillIcon(): ReactNode {
  return h('svg', {
    width: 16, height: 16, viewBox: '0 0 14 14', fill: 'currentColor',
    xmlns: 'http://www.w3.org/2000/svg', style: { flexShrink: 0 },
  }, h('path', { d: SKILL_ICON_PATH }))
}

function SkillPanel({ t, ctx, onClose }: { t: Translate; ctx: DiscoveryClientContext; onClose: () => void }) {
  const [skills, setSkills] = useState<SkillInfo[] | null>(null)
  const [detail, setDetail] = useState<SkillDetail | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'all' | 'source' | 'group'>('all')

  const load = (): void => {
    setError('')
    fetch('/dsh-skillmanager/list', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: { skills: SkillInfo[] }) => setSkills(body.skills ?? []))
      .catch(() => setError(t('loadFail')))
  }
  useEffect(load, [])

  const openDetail = (name: string): void => {
    setDetail(null)
    fetch(`/dsh-skillmanager/get?name=${encodeURIComponent(name)}`, { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: { skill: SkillDetail }) => setDetail(body.skill))
      .catch(() => setError(t('loadFail')))
  }

  const toggle = (name: string, key: 'modelInvocable' | 'userInvocable', silent = false): void => {
    fetch(`/dsh-skillmanager/toggle?name=${encodeURIComponent(name)}&key=${key}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((body: { ok?: boolean; error?: string }) => {
        if (body.ok) { if (!silent) load() }
        else if (!silent) setError(body.error ?? t('toggleFail'))
      })
      .catch(() => { if (!silent) setError(t('toggleFail')) })
  }

  // 批量：组内全部启用/禁用（model+user 双开关）
  const batchToggle = (list: SkillInfo[], target: 'on' | 'off'): void => {
    for (const skill of list) {
      const wantOn = target === 'on'
      if (skill.invocation.modelInvocable !== wantOn) toggle(skill.name, 'modelInvocable', true)
      if (skill.invocation.userInvocable !== wantOn) toggle(skill.name, 'userInvocable', true)
    }
    setTimeout(load, 400)
  }

  // 设置合集（group/subgroup）——简单交互：prompt 输入
  const setGroup = (skill: SkillInfo): void => {
    const current = skill.group ?? ''
    const group = window.prompt(`${t('setGroup')} — ${t('groupNamePh')}`, current)
    if (group === null) return
    const subgroup = window.prompt(t('subgroupNamePh'), skill.subgroup ?? '')
    if (subgroup === null) return
    fetch('/dsh-skillmanager/group', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: skill.name, group: group.trim() || null, subgroup: subgroup.trim() || null }),
    })
      .then((res) => res.json())
      .then((body: { ok?: boolean; error?: string }) => {
        if (body.ok) load()
        else setError(body.error ?? t('toggleFail'))
      })
      .catch(() => setError(t('toggleFail')))
  }

  const review = (skill: SkillInfo): void => {
    onClose()
    void openSessionAndSend(ctx, buildReviewPrompt(skill, t))
  }
  const create = (): void => {
    onClose()
    void openSessionAndSend(ctx, buildCreatePrompt(t))
  }

  const all = skills ?? []

  // 视图分组
  const renderGroup = (label: string, list: SkillInfo[]): ReactNode => h('div', { key: label },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 6px' } },
      h('span', { style: { fontSize: 11, fontWeight: 600, color: 'var(--dsw-alias-label-secondary, #9aa0b4)' } }, `${label} (${list.length})`),
      h('span', { style: { flex: 1 } }),
      h('button', { type: 'button', style: btnStyle, onClick: () => batchToggle(list, 'on') }, t('enableAll')),
      h('button', { type: 'button', style: btnStyle, onClick: () => batchToggle(list, 'off') }, t('disableAll')),
    ),
    list.map((skill) => renderSkill(skill)),
  )

  const renderSkill = (skill: SkillInfo): ReactNode => h('div', { key: skill.name, style: itemStyle },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('span', { style: nameStyle }, skill.name),
      h('span', { style: badgeStyle }, skill.provider),
      skill.group !== undefined && h('span', { style: groupBadgeStyle },
        skill.subgroup !== undefined ? `${skill.group} / ${skill.subgroup}` : skill.group),
      h('span', { style: { flex: 1 } }),
      h('button', { type: 'button', style: btnStyle, onClick: () => setGroup(skill) }, t('setGroup')),
      h('button', {
        type: 'button',
        style: skill.invocation.modelInvocable ? toggleOnStyle : toggleOffStyle,
        onClick: () => toggle(skill.name, 'modelInvocable'),
        title: t('modelInvoke'),
      }, `${t('modelInvoke')}: ${skill.invocation.modelInvocable ? t('enabled') : t('disabled')}`),
      h('button', {
        type: 'button',
        style: skill.invocation.userInvocable ? toggleOnStyle : toggleOffStyle,
        onClick: () => toggle(skill.name, 'userInvocable'),
        title: t('userInvoke'),
      }, `${t('userInvoke')}: ${skill.invocation.userInvocable ? t('enabled') : t('disabled')}`),
      h('button', { type: 'button', style: btnStyle, onClick: () => openDetail(skill.name) }, t('viewDetail')),
      h('button', { type: 'button', style: btnStyle, onClick: () => review(skill) }, t('reviewSkill')),
    ),
    h('div', { style: descStyle }, skill.description),
    h('div', { style: metaStyle }, skill.whenToUse !== undefined ? `${t('whenToUse')}: ${skill.whenToUse}` : ''),
    detail !== null && detail.name === skill.name && h('div', { style: contentStyle },
      detail.path !== undefined && h('div', { style: metaStyle }, `${t('path')}: ${detail.path}`),
      h('div', { style: { fontWeight: 600, margin: '6px 0 3px' } }, `${t('contentPreview')} (${detail.content.length} chars)`),
      detail.content,
    ),
  )

  // 按来源分组
  const bySource = new Map<string, SkillInfo[]>()
  for (const skill of all) {
    const list = bySource.get(skill.source) ?? []
    list.push(skill)
    bySource.set(skill.source, list)
  }
  const orderedSources = [...bySource.keys()].sort((a, b) => {
    const ia = SOURCE_ORDER.indexOf(a as never)
    const ib = SOURCE_ORDER.indexOf(b as never)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
  })

  // 按合集分组
  const byGroup = new Map<string, SkillInfo[]>()
  for (const skill of all) {
    const key = skill.group ?? ''
    const list = byGroup.get(key) ?? []
    list.push(skill)
    byGroup.set(key, list)
  }
  const orderedGroups = [...byGroup.keys()].sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    return a.localeCompare(b, 'zh')
  })

  const viewBtn = (id: 'all' | 'source' | 'group', label: string): ReactNode => h('button', {
    type: 'button',
    style: view === id ? catOnStyle : catStyle,
    onClick: () => setView(id),
  }, label)

  return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 } },
    h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--dsw-alias-border-l2, #2e2e4a)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('button', { type: 'button', style: primaryBtn, onClick: create }, `+ ${t('createSkill')}`),
      h('span', { style: { flex: 1 } }),
      viewBtn('all', t('viewAll')),
      viewBtn('source', t('viewSource')),
      viewBtn('group', t('viewGroup')),
    ),
    error !== '' && h('div', { style: emptyStyle }, error),
    skills === null && !error && h('div', { style: emptyStyle }, t('loading')),
    skills !== null && skills.length === 0 && h('div', { style: emptyStyle }, t('empty')),
    skills !== null && h('div', { style: { flex: 1, overflowY: 'auto', padding: '16px 20px 24px' } },
      h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginBottom: 8 } }, t('total').replace('{n}', String(skills.length))),
      view === 'all' && all.map(renderSkill),
      view === 'source' && orderedSources.map((source) => renderGroup(sourceLabel(source), bySource.get(source)!)),
      view === 'group' && orderedGroups.map((group) => renderGroup(group === '' ? t('noGroup') : group, byGroup.get(group)!)),
    ),
  )
}

/* ── entry ──────────────────────────────────────────────────────────────── */

export function apply(ctx: DiscoveryClientContext): void {
  const NS = 'dsh-skillmanager'
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-skillmanager: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('sidebar.primary.action', () => ctx.slots.register({
    name: 'sidebar.primary.action',
    id: 'dsh-skillmanager',
    order: 2,
    locale: NS,
  }, (owner: { wide: boolean }) => h(SkillTrigger, { wide: owner.wide ?? false, t, ctx })))
}

function SkillTrigger({ wide, t, ctx }: { wide: boolean; t: Translate; ctx: DiscoveryClientContext }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const close = (): void => setOpen(false)
  const closeButton = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [open])
  useEffect(() => { if (open) closeButton.current?.focus() }, [open])

  const style = wide ? { ...sidebarBtnStyle, ...(hovered ? btnHoverStyle : null) } : railStyle

  return h('div', { style: { display: 'contents' } },
    h('button', {
      type: 'button',
      style,
      title: t('nav'),
      'aria-label': t('nav'),
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onClick: () => setOpen(true),
    },
      h(SkillIcon),
      wide && h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('nav')),
    ),
    open && h('div', { style: maskStyle, onClick: close },
      h('div', { style: panelStyle, onClick: (e: React.MouseEvent) => e.stopPropagation() },
        h('div', { style: headerStyle },
          h(SkillIcon),
          h('span', null, t('nav')),
          h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', fontWeight: 400 } }, t('subtitle')),
          h('button', { ref: closeButton, style: closeStyle, onClick: close, 'aria-label': 'Close' }, '✕'),
        ),
        h('div', { style: { flex: 1, overflowY: 'hidden', padding: '0 4px' } }, h(SkillPanel, { t, ctx, onClose: close })),
      ),
    ),
  )
}
