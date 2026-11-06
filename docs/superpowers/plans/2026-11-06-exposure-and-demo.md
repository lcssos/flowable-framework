# 在线 Demo 与仓库曝光 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让陌生人能在 GitHub 搜到 `flowable-framework` 并零安装体验其 BPMN 设计器，同时保证 README 里的本地运行命令真的能跑通。

**Architecture:** 三块独立改动。① 先修掉 5 处既有 `TS2322`，让 `pnpm build` 在干净环境可用（否则 CI 必红）。② 给 `designer` 增加 demo 构建模式：`loadEnv` 注入 `base` 与 `VITE_DEMO`，输出到独立目录，运行时跳过登录/接口并首屏加载真实流程。③ 建立 GitHub Actions 发布静态站到 Pages，并重写 README 首屏、补 topics 与语言标记。

**Tech Stack:** Vite 6 / Vue 3.5 / TypeScript / vue-tsc / pnpm 9.6 / GitHub Actions / GitHub Pages

**Spec:** `docs/superpowers/specs/2026-11-06-exposure-and-demo-design.md`

## Global Constraints

- Pages 地址固定为 `https://lcssos.github.io/flowable-framework/`，demo 构建的 `base` 必须是 `/flowable-framework/`。
- 现有 `pnpm build` 必须继续输出到 `../src/main/resources/static`（Spring Boot 打包依赖此路径），行为不得改变。
- demo 构建输出到 `designer/dist-demo/`，该目录加入 `.gitignore`。
- `designer/` 派生自 `tsai996/vue-bpmn-designer`（Apache-2.0）；不得删除或改写 `NOTICE`、`designer/LICENSE` 中的归属声明。
- 不改后端 Java 代码。
- 不改变 `designer` 任何功能逻辑（主题、lint、渲染、建模规则）。
- 5 处 `TS2322` 只做让类型通过的最小窄化，不重构组件结构、不改变运行时行为。
- 新增 i18n 文案必须四语言齐全（zh-CN / zh-TW / en-US / ja-JP），因为 `fallbackLocale` 是 `zh-CN`，缺英文键会在英文界面显示中文。

## Review Focus

按最可能踩坑的顺序，列出 spec 隐含但任何单个任务的验证都覆盖不到的行为，每条都要在对应任务里落成验证步骤：

1. **干净环境下的类型检查**：本地有 `tsbuildinfo` 缓存会掩盖错误，只有删除缓存后的 `pnpm type-check` 才代表 CI 的真实结果。→ Task 1 验证步骤要求先删缓存。
2. **`base` 注入路径**：`process.env.VITE_BASE` 读不到 `.env.demo`，只有 `loadEnv(mode,...)` 能读到。若写错，本地构建"成功"但线上整站白屏。→ Task 2 要求断言构建产物中的资源前缀。
3. **`?key=` 绕过 demo 保护**：带 `?key=xxx` 访问时若仍走 `getModel`，会落到空白画布 + 3 个 lint 红叉。→ Task 3 要求以 `?key=leave` 实测。
4. **英文界面回落中文**：`en-US` 本就缺 17 个键，新增文案若漏翻，英文界面会冒出中文提示。→ Task 3 要求切 English 后验证提示文案。
5. **非 demo 构建回归**：改动 `vite.config.ts` 为函数式后，若默认值写错，后端打包会拿到错误路径或错误的 `base`。→ Task 2 要求非 demo 构建产物仍落在 `../src/main/resources/static`。

---

## File Structure

| 文件 | 责任 |
|---|---|
| `designer/src/views/ProcessDesigner/Panel/BaseActivity/ListenerDrawer.vue` | 类型修复：`event` 可能是数组 |
| `designer/src/views/ProcessDesigner/Panel/Process/DataObjectDrawer.vue` | 类型修复：`value` 联合类型与 EP prop 不兼容（两处） |
| `designer/src/views/ProcessDesigner/Panel/Process/EventListenerDrawer.vue` | 类型修复：change 回调签名 |
| `designer/src/views/ProcessDesigner/Panel/ScriptTask/index.vue` | 类型修复：change 回调签名 |
| `designer/vite.config.ts` | 改为函数式 config，`base` / `outDir` 可由 env 覆盖 |
| `designer/.env.demo` | demo 构建的变量来源 |
| `designer/env.d.ts` | 补 `VITE_DEMO` 类型声明 |
| `designer/src/demo.ts` | `isDemoMode` 单一判定点 |
| `designer/src/views/ProcessDesigner/index.vue` | 4 处 demo 分支（ensureLogin / save / openDefinitions / restoreOpenedProcess） |
| `designer/src/languages/langs/*/index.ts` | 四语言新增 `ui.demoDisabled` |
| `designer/public/demo/leave.bpmn20.xml` | 静态站首屏流程 |
| `.github/workflows/pages.yml` | Pages 部署流水线 |
| `.gitattributes` | 语言统计标记 |
| `.gitignore` | 忽略 `designer/dist-demo/` |
| `README.md` / `README.zh-CN.md` | 首屏重写 |

---

## Task 1: 修复 5 处既有 TypeScript 错误

**Files:**
- Modify: `designer/src/views/ProcessDesigner/Panel/BaseActivity/ListenerDrawer.vue:142`
- Modify: `designer/src/views/ProcessDesigner/Panel/Process/DataObjectDrawer.vue:98,128`
- Modify: `designer/src/views/ProcessDesigner/Panel/Process/EventListenerDrawer.vue:249`
- Modify: `designer/src/views/ProcessDesigner/Panel/ScriptTask/index.vue:36`

**Interfaces:**
- Consumes: 既有类型 `Listener.event: string | string[]`（`src/types/index.ts:23`）、`DataObject.value?: string | number | boolean`（`src/types/index.ts:81`）、`useCustomRef<T = string>`（`src/views/ProcessDesigner/utils/ElementUtil.ts:115`）
- Produces: 无新接口；仅使 `pnpm type-check` 归零

- [ ] **Step 1: 确认基线错误**

Run: `cd designer && rm -f tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo && npx vue-tsc --build; echo "exit=$?"`

Expected: 5 个 `error TS2322`，`exit=2`。记录这 5 个文件:行，与上表核对。

- [ ] **Step 2: 修 `ListenerDrawer.vue:142`（event 可能是数组）**

`cloned.event` 类型是 `string | string[]`，`el-radio-group` 的 `modelValue` 只接受标量。改为窄化传入：

```vue
<el-radio-group v-model="cloned.event as string">
```

说明：该 radio-group 的选项来自 `eventOptions` slot，实际只会是单个字符串；数组形态由其他分支（多选用例）使用，此组件不涉及。断言只影响模板类型，不改变运行时值。

- [ ] **Step 3: 修 `DataObjectDrawer.vue:98,128`（value 联合类型）**

第 98 行 `el-input` 的 `v-model`、第 128 行 `el-date-picker` 的 `v-model` 都绑定 `cloned.value`（`string | number | boolean | undefined`）。两处分别按分支已知类型窄化：

```vue
<!-- line 98, 在 v-if="cloned.type === 'xsd:string'" 分支内 -->
v-model="cloned.value as string"
```

```vue
<!-- line 128, 在 v-else-if="cloned.type === 'xsd:datetime'" 分支内 -->
v-model="cloned.value as string"
```

说明：`v-if` 链已保证分支内数据类型；这两个控件都只产出字符串。

- [ ] **Step 4: 修 `EventListenerDrawer.vue:249`（change 回调签名）**

`changeRethrowEvent(rethrowEvent: boolean)` 与 `el-radio-group` 的 `change` 事件 `(val: string | number | boolean | undefined) => any` 不兼容。放宽形参类型并在函数内窄化：

```ts
const changeRethrowEvent = (rethrowEvent: string | number | boolean | undefined) => {
  if (rethrowEvent === true) {
```

`if (rethrowEvent)` 改为 `if (rethrowEvent === true)`，保证行为与原意一致（原来只在 `true` 时进入该分支）。

- [ ] **Step 5: 修 `ScriptTask/index.vue:36`（change 回调签名）**

`changeScriptFormat(val: string)` 同样不兼容。放宽形参并窄化：

```ts
const changeScriptFormat = (val: string | number | boolean | undefined) => {
  if (val === 'javascript') {
```

函数体已有的 `val === 'javascript'` / `val === 'juel'` 比较无需改动。

- [ ] **Step 6: 验证类型检查归零**

Run: `cd designer && rm -f tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo && npx vue-tsc --build; echo "exit=$?"`

Expected: 无 `error TS` 输出，`exit=0`。

- [ ] **Step 7: 验证构建在干净环境通过**

Run: `cd designer && rm -f tsconfig.app.tsbuildinfo tsconfig.node.tsbuildinfo && pnpm build; echo "exit=$?"`

Expected: `exit=0`，末尾 `✓ built in ...`。

- [ ] **Step 8: Commit**

```bash
git add designer/src/views/ProcessDesigner/Panel
git commit -m "fix(designer): 修复 5 处既有 TS2322，恢复干净环境下的类型检查"
```

---

## Task 2: demo 构建模式

**Files:**
- Modify: `designer/vite.config.ts`
- Create: `designer/.env.demo`
- Create: `designer/env.d.ts`（修改既有文件，追加声明）
- Modify: `designer/package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Task 1 完成后的干净类型检查
- Produces: `pnpm build:demo` 脚本；构建期 `base = /flowable-framework/`；产物目录 `designer/dist-demo/`

- [ ] **Step 1: 改造 `vite.config.ts` 为函数式 config**

把 `export default defineConfig({` 改为：

```ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'
  const outDir = env.VITE_DEMO === 'true' ? 'dist-demo' : '../src/main/resources/static'
  return {
```

在文件顶部 import 中加入 `loadEnv`：

```ts
import { defineConfig, loadEnv } from 'vite'
```

把原 `base: '/',` 替换为 `base,`，把 `build.outDir` 的值替换为 `outDir,`。文件末尾的 `})` 改为 `}\n})`。

注意：`loadEnv(mode, process.cwd(), '')` 的第三个参数是空字符串，表示不限制前缀，这样能读到 `VITE_BASE` / `VITE_DEMO`（默认只读 `VITE_` 前缀也能读到，但显式传空更明确）。**不能用 `process.env.VITE_BASE`**。

- [ ] **Step 2: 创建 `designer/.env.demo`**

```dotenv
VITE_DEMO=true
VITE_BASE=/flowable-framework/
```

- [ ] **Step 3: 补 `env.d.ts` 类型声明**

在 `interface ImportMetaEnv` 内追加一行：

```ts
    readonly VITE_DEMO?: string
```

保持既有 `readonly BASE_URL: string` 不变。

- [ ] **Step 4: 新增 `build:demo` 脚本**

在 `designer/package.json` 的 `scripts` 中，紧跟 `"build": ...` 之后加入：

```json
    "build:demo": "run-p type-check \"build-only --mode demo {@}\" --",
```

- [ ] **Step 5: 忽略 demo 产物**

在根 `.gitignore` 的 `designer/node_modules/` 之后追加一行：

```text
designer/dist-demo/
```

- [ ] **Step 6: 验证 demo 构建的 base 与输出目录**

Run: `cd designer && pnpm build:demo > /tmp/demo-build.log 2>&1; echo "exit=$?"; ls dist-demo/index.html && grep -o '/flowable-framework/assets/[^"]*' dist-demo/index.html | head -3`

Expected: `exit=0`；`dist-demo/index.html` 存在；grep 输出至少一行以 `/flowable-framework/assets/` 开头的资源路径。

若 grep 无输出，说明 `base` 未生效（极可能是误用了 `process.env`），回到 Step 1 检查。

- [ ] **Step 7: 验证非 demo 构建回归**

Run: `cd designer && pnpm build > /tmp/prod-build.log 2>&1; echo "exit=$?"; ls ../src/main/resources/static/index.html`

Expected: `exit=0`；`../src/main/resources/static/index.html` 存在。同时确认 `dist-demo` 未被写入新时间戳。

- [ ] **Step 8: Commit**

```bash
git add designer/vite.config.ts designer/.env.demo designer/env.d.ts designer/package.json .gitignore
git commit -m "feat(designer): 增加 demo 构建模式，base 与输出目录可由环境变量覆盖"
```

---

## Task 3: demo 运行时行为

**Files:**
- Create: `designer/src/demo.ts`
- Create: `designer/public/demo/leave.bpmn20.xml`
- Modify: `designer/src/views/ProcessDesigner/index.vue`
- Modify: `designer/src/languages/langs/zh-CN/index.ts`
- Modify: `designer/src/languages/langs/zh-TW/index.ts`
- Modify: `designer/src/languages/langs/en-US/index.ts`
- Modify: `designer/src/languages/langs/ja-JP/index.ts`

**Interfaces:**
- Consumes: Task 2 的 `import.meta.env.VITE_DEMO` 类型声明
- Produces: `isDemoMode: boolean`（从 `@/demo` 默认具名导出）

- [ ] **Step 1: 创建 `designer/src/demo.ts`**

```ts
export const isDemoMode = import.meta.env.VITE_DEMO === 'true'
```

- [ ] **Step 2: 复制首屏流程文件**

Run: `cd /Users/lcssos/wks/github/flowable-framework && mkdir -p designer/public/demo && cp src/main/resources/processes/leave.bpmn20.xml designer/public/demo/leave.bpmn20.xml && ls -l designer/public/demo/`

Expected: 文件存在，大小约 2.2KB。

- [ ] **Step 3: 四语言补 `ui.demoDisabled`**

在四个语言文件的 `ui` 对象内各加一条（放在 `saved` 之后）：

- `zh-CN`：`demoDisabled: '在线预览不支持打开与保存，请按 README 在本地运行完整版本',`
- `zh-TW`：`demoDisabled: '線上預覽不支援開啟與儲存，請依 README 在本機執行完整版本',`
- `en-US`：`demoDisabled: 'This live preview does not support open or save. Run the full version locally as described in the README.',`
- `ja-JP`：`demoDisabled: 'オンラインプレビューでは開く／保存はできません。README に従ってローカルで完全版を実行してください。',`

- [ ] **Step 4: 改造 `ensureLogin`**

在 `designer/src/views/ProcessDesigner/index.vue` 顶部 import 区加入：

```ts
import { isDemoMode } from '@/demo'
```

把 `ensureLogin` 改为：

```ts
const ensureLogin = async () => {
  if (isDemoMode) {
    return false
  }
  if (await hasSession()) {
    return true
  }
  loginVisible.value = true
  return false
}
```

- [ ] **Step 5: 改造 `openDefinitions` 与 `save`**

`openDefinitions` 开头插入：

```ts
  if (isDemoMode) {
    ElMessage.warning(t('ui.demoDisabled'))
    return
  }
```

`save` 开头插入同样三行。

- [ ] **Step 6: 改造 `restoreOpenedProcess`**

整体替换为：

```ts
const restoreOpenedProcess = async () => {
  if (props.xml) {
    await importDiagram(props.xml)
    return
  }
  if (isDemoMode) {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}demo/leave.bpmn20.xml`)
      if (!response.ok) {
        throw new Error(`failed to load demo process: ${response.status}`)
      }
      await importDiagram(await xmlWithDiagram(await response.text()))
    } catch (error) {
      await showNewProcess()
      showError(error)
    }
    return
  }
  const key = processKeyFromUrl()
  if (!key || !(await ensureLogin())) {
    await showNewProcess()
    return
  }
  try {
    await openModel(key)
  } catch (error) {
    writeProcessKey(null)
    await showNewProcess()
    showError(error)
  }
}
```

关键点：demo 分支在读取 `?key=` **之前** 返回，因此带 `?key=leave` 访问时也不会调用 `getModel`。

- [ ] **Step 7: 验证 demo 站行为**

Run: `cd designer && pnpm build:demo > /tmp/demo2.log 2>&1; echo "build exit=$?"; npx vite preview --port 4173 --strictPort > /tmp/preview2.log 2>&1 &`

等待 preview 就绪（`curl -sf -o /dev/null http://localhost:4173/flowable-framework/ && echo ready`），然后用浏览器验证：

- 打开 `http://localhost:4173/flowable-framework/`：无登录弹窗；画布已渲染请假流程（含"经理审批""HR审批"节点）；lint 不再显示 3 个错误。
- 打开 `http://localhost:4173/flowable-framework/?key=leave`：仍是请假流程，不是空白画布。
- 点击"保存"：出现 warning 提示，文案为中文；控制台无 `/api/auth/me` 或 `/api/process-definitions` 请求。
- 切换到 English 后点击"保存"：提示为英文（验证四语言齐全）。
- 切换主题为"国风"、语言为"日本語"：均正常无报错。

- [ ] **Step 8: Commit**

```bash
git add designer/src/demo.ts designer/public/demo designer/src/views/ProcessDesigner/index.vue designer/src/languages
git commit -m "feat(designer): demo 模式跳过登录与后端调用，首屏加载请假流程"
```

---

## Task 4: Pages 部署流水线

**Files:**
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: Task 2 的 `pnpm build:demo`、Task 3 的 demo 运行时
- Produces: 部署到 GitHub Pages 的静态站

- [ ] **Step 1: 创建 workflow**

```yaml
name: Deploy demo to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'designer/**'
      - '.github/workflows/pages.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.6.0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: designer/pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
        working-directory: designer
      - run: pnpm build:demo
        working-directory: designer
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: designer/dist-demo
      - uses: actions/deploy-pages@v4
        id: deployment
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
```

- [ ] **Step 2: 尝试用 gh 启用 Pages**

Run: `gh api -X POST repos/lcssos/flowable-framework/pages -f build_type=workflow 2>&1 | head -5`

Expected: 成功返回包含 `html_url`；若返回 `403 Resource not accessible by integration`，记录该结果并继续——需人工在 Settings → Pages 把 Source 设为 **GitHub Actions**，这是唯一需要人工的一步。

- [ ] **Step 3: 提交并推送触发部署**

```bash
git add .github/workflows/pages.yml
git commit -m "ci: 增加 demo 静态站到 GitHub Pages 的部署流水线"
git push origin main
```

- [ ] **Step 4: 验证部署成功**

Run: `gh run list --workflow=pages.yml --limit 1`，取 run id 后 `gh run watch <id>`。

Expected: 结论 `success`。随后 `curl -sf -o /dev/null -w "%{http_code}" https://lcssos.github.io/flowable-framework/` 返回 `200`。

若失败，`gh run view <id> --log-failed` 查看；常见原因是 Pages 未启用（Step 2 失败且未人工设置）。

---

## Task 5: README 首屏与仓库元信息

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Create: `.gitattributes`

**Interfaces:**
- Consumes: Task 4 的 Pages 地址
- Produces: 无代码接口

- [ ] **Step 1: 重写 `README.md` 首屏**

**关键事实（已实测）**：全新 `git clone` 后 `src/main/resources/static/` 不存在（`git ls-files` 计数为 0，该目录被 `.gitignore` 忽略）。因此**不构建前端就直接 `./mvnw spring-boot:run`，打开 8080 会是白页**。Quick start 必须把前端构建包含进去，否则"让陌生人跑起来"这个目标直接落空。

把开头到 `## Overview` 之前替换为：

```markdown
<div align="center">

<img src="./docs/images/designer-overview.png" alt="BPMN process designer" width="900">

# flowable-framework

A Spring Boot + Flowable 7.2 workflow backend with a built-in BPMN process designer.

[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.16-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Flowable](https://img.shields.io/badge/Flowable-7.2.0-9cf.svg)](https://www.flowable.org/)
[![Live Demo](https://img.shields.io/badge/%E2%96%B6_Live_Demo-try_the_designer-2ea44f.svg)](https://lcssos.github.io/flowable-framework/)

**[▶ Try the designer in your browser](https://lcssos.github.io/flowable-framework/)** — no install needed.

English | [简体中文](./README.zh-CN.md)

</div>

---

## Quick start

```bash
# 1. build the designer (the backend serves it from src/main/resources/static)
cd designer && pnpm install && pnpm build && cd ..

# 2. run the backend
./mvnw spring-boot:run
```

Open <http://localhost:8080> and sign in as `admin` / `test`.

> Step 1 is not optional: a fresh clone has no prebuilt frontend, so the
> backend alone would serve an empty page.

The live demo above runs the same designer as a static site — you can model,
theme, lint and simulate there, but open/save need this backend.

## Overview
```

保留原 `## Overview` 及其后全部内容不变。

- [ ] **Step 2: 同步 `README.zh-CN.md` 首屏**

用相同结构，中文文案替换，语言链接改为 `[English](./README.md) | 简体中文`，Demo 按钮改为 `**[▶ 在浏览器中试用设计器](https://lcssos.github.io/flowable-framework/)** —— 无需安装`。Quick start 的中文说明需同样强调**必须先构建前端**：

```bash
# 1. 构建设计器（后端从 src/main/resources/static 提供页面）
cd designer && pnpm install && pnpm build && cd ..

# 2. 启动后端
./mvnw spring-boot:run
```

并保留提示：全新克隆的仓库没有预构建前端，只启动后端会看到空白页。

- [ ] **Step 3: 创建 `.gitattributes`**

```gitattributes
# designer/ 派生自 tsai996/vue-bpmn-designer，不计入仓库语言统计
designer/** linguist-vendored

# BPMN 定义按 XML 统计
*.bpmn20.xml linguist-language=XML
```

`designer/` 内的归属声明文件（`designer/LICENSE`、`NOTICE`）仍保留在仓库中，vendored 标记只影响语言统计，不影响可读性与许可证效力。

- [ ] **Step 4: 更新仓库元信息**

```bash
gh repo edit lcssos/flowable-framework \
  --description "Spring Boot + Flowable 7.2 workflow backend with a built-in BPMN process designer (Vue 3)" \
  --homepage "https://lcssos.github.io/flowable-framework/" \
  --add-topic bpmn-designer --add-topic process-designer --add-topic low-code \
  --add-topic workflow-engine --add-topic java --add-topic flowable --add-topic spring-boot \
  --add-topic vue3 --add-topic bpmn-js --add-topic workflow
```

- [ ] **Step 5: 验证语言标记生效**

Run: `gh api repos/lcssos/flowable-framework/languages`

Expected: 推送后数分钟内，`Java` 成为字节数最高的键（`TypeScript` / `Vue` 应大幅下降或消失）。注意 linguist 统计有延迟，若未立即生效，等待 5 分钟后重查。

- [ ] **Step 6: Commit**

```bash
git add README.md README.zh-CN.md .gitattributes
git commit -m "docs: 重写首屏并补充在线 Demo 入口、徽章与语言标记"
git push origin main
```

---

## Self-Review

**1. Spec coverage**

| Spec 要求 | 对应任务 |
|---|---|
| 修复 5 处 TS2322（用户选 1B） | Task 1 |
| demo 构建模式、base 注入、独立输出目录 | Task 2 |
| 不弹登录框 | Task 3 Step 4 |
| 打开/保存提示 | Task 3 Step 5 |
| 首屏加载 leave 流程 | Task 3 Steps 2, 6 |
| `?key=` 覆盖 | Task 3 Step 6 |
| 四语言文案 | Task 3 Step 3 |
| Pages workflow | Task 4 |
| README 首屏 + 徽章 | Task 5 Steps 1-2 |
| topics 与 description | Task 5 Step 4 |
| `.gitattributes` 语言标记 | Task 5 Step 3 |
| `.gitignore` 忽略 dist-demo | Task 2 Step 5 |
| 复用现有截图 | Task 5 Step 1 |
| 不破坏后端打包 | Task 2 Step 7 验证 |

无遗漏。

**2. Step scan**：每个步骤给出可执行的命令或精确的代码改动，无"TBD""适当处理"类空步骤。

**3. Type consistency**：`isDemoMode` 在 Task 3 定义并由同任务的 `index.vue` 消费，命名一致；`VITE_DEMO` 在 Task 2 声明、Task 3 读取，一致；`build:demo` 在 Task 2 定义、Task 4 调用，一致。

**4. Review Focus**：5 条全部有对应验证步骤（Task 1 Step 6 删缓存；Task 2 Step 6 grep base；Task 3 Step 7 测 `?key=`；Task 3 Step 7 切英文；Task 2 Step 7 非 demo 回归）。

**5. Proportion**：计划长度与 spec 相当，代码块集中在必须精确复现的配置与改动处，未逐行转录组件实现。

**6. 自查后补入的关键发现**：全新 clone 无 `src/main/resources/static`（已用 `git archive` 模拟验证），因此 README 的 Quick start 必须包含 `pnpm build`，否则陌生人打开 8080 是白页。该修正已写入 Task 5 Steps 1-2 与 spec。
