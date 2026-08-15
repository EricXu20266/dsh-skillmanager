# dsh-skillmanager

DSH 技能管理器（DSH skill manager）——列出、分组、启用/禁用本机 DHS 技能；技能的创建与编辑交由 host agent（LLM）完成。

## 功能

- **技能列表**：扫描文件系统（`~/.dsh/skills`、`~/.agents/skills`、内置 `DSH_BUNDLED_SKILL_DIR`），解析 SKILL.md frontmatter——不依赖 preset 是否加载 provider，管理以文件系统为准
- **三视图**：全部 / 按来源（user-dsh、user-agents、项目、内置）/ 按合集（group，含子合集 subgroup）
- **合集管理**：给技能设置/清除 group 与 subgroup（写入 frontmatter `metadata.group/subgroup`，DHS 原生读取），组内**一键全部启用/全部禁用**
- **启用/禁用**：模型可调用 / 用户可调用双开关（改 frontmatter `invocation`，DHS 原生机制）
- **详情**：触发时机、正文预览、文件路径
- **LLM 审查**：一键生成审查 prompt 交 DHS（指令质量/安全风险/改进建议，需要修改时直接编辑文件）
- **新建技能**：引导 DHS 在技能目录创建新技能
- **i18n**：zh / en 双语

## 安装

```sh
# 从 GitHub 安装（首次需要允许构建，dsh 会给出提示，把包 key 加入 profile 的 pnpm-workspace.yaml allowBuilds）
dsh plugin add github:EricXu20266/dsh-skillmanager

# 或从 npm 安装（预构建产物，无需授权）
dsh plugin add dsh-skillmanager
```

## 使用

安装后重启 dsh 会话，侧边栏出现「技能管理」入口。

## 开发

```sh
pnpm install
pnpm build          # tsc 编译 host 侧 → lib/
pnpm bundle:client  # tsdown 打包 client 侧 → client/client.js
```

## 许可

MIT
