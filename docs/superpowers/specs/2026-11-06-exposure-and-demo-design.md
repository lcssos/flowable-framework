# 让陌生人搜到并能跑起来：在线 Demo + 仓库曝光

Date: 2026-11-06
Status: 待实现

## 意图

仓库 `lcssos/flowable-framework` 上线后，外部流量只有零星克隆，没有人 star、没有 issue、没有被任何公开项目依赖。查看 GitHub 流量能看到两个具体问题：

1. **搜不到**：GitHub 把仓库语言判定成 TypeScript（TS 375KB / Vue 252KB / Java 83KB），按 `spring boot`、`flowable` 这类关键词搜索时基本不会出现。
2. **跑不起来**：README 首屏只有一行描述，陌生人要装 JDK 21 + Node 20 + pnpm，再分别启动前后端，才能看到这个项目最值得看的部分——内置的 BPMN 设计器。

而设计器（`designer/`）实际只依赖 `/api` 做登录、读流程、存流程，画图、主题、多语言、lint、令牌模拟全部在前端完成。也就是说，把它部署成静态站点就能让陌生人零安装体验到核心卖点。

目标因此明确为：**让搜到的人，在 10 秒内看到项目最好的一面，并且知道怎么完整跑起来。**

## 目标

- 陌生人在 GitHub 仓库页首屏就能看到设计器长什么样，并能一键进入在线体验。
- 在线体验无需安装任何东西，可完成：拖动建节点、切主题、切语言、lint 校验、令牌模拟。
- 在线体验中，依赖后端的操作给出诚实提示，而不是静默失败或假装成功。
- 仓库在 GitHub 语言统计中显示为 Java，提升在 Spring Boot / Flowable 相关搜索中的可见度。
- README 标题、描述、徽章、topics 覆盖英文搜索词。

## 非目标

- 不做 Docker / devcontainer 一键部署（本次不做，属后续独立议题）。
- 不为 Demo 写前端 mock 后端、不让保存假装成功。
- 不在线上 Demo 里支持真实登录、真实流程持久化。
- 不做 GitHub Discussions、不做社区推广发帖。
- 不改后端 Java 代码，不改 `designer/` 的功能逻辑（主题、lint、渲染规则等）。
- 不重构 5 处 `TS2322` 周边的组件结构，只做让类型通过的最小窄化。

## 约束

- Pages 地址固定为 `https://lcssos.github.io/flowable-framework/`，vite `base` 必须与之一致，否则静态资源 404。
- 现有 `pnpm build` 会把产物输出到 `../src/main/resources/static`（被 `.gitignore` 忽略），供 Spring Boot 打包。**Demo 构建不能覆盖这个路径假设**，否则会破坏后端打包流程。
- **全新 clone 后 `src/main/resources/static/` 不存在**（已用 `git archive` 实测，`git ls-files` 计数为 0）。因此 README 的 Quick start 必须包含前端构建（`cd designer && pnpm install && pnpm build`），否则陌生人只启动后端会看到白页——这会直接违背"让陌生人跑起来"的目标。
- `designer/` 派生自 `tsai996/vue-bpmn-designer`（Apache-2.0），改动必须保留 `NOTICE` 与 `designer/LICENSE` 中的归属声明。
- 仓库当前无 `.github/`，CI 需从零建立。
- 构建基线（已实测）：`pnpm install --frozen-lockfile` 2.2s，`pnpm build` 39.2s，产物 JS 2161KB(raw)/662KB(gzip)、CSS 371KB/86KB(gzip)。
- **`pnpm build` 在干净环境下会失败**（实测三次：带 `tsconfig.app.tsbuildinfo` 缓存时 exit 0；删除缓存后连续两次 exit 1 / `ERROR: "type-check" exited with 2`）。根因是 5 处既有 `TS2322`（`ListenerDrawer.vue:142`、`DataObjectDrawer.vue:98/128`、`EventListenerDrawer.vue:249`、`ScriptTask/index.vue:36`）。`build` 脚本是 `run-p type-check build-only`，而 `vue-tsc --build` 是增量构建——**首次全量检查必报错，有缓存时被跳过**，所以本地看起来是"有时成功"。
- **Vite 在解析 config 之后才 `loadEnv`**，因此 `process.env.VITE_BASE` 在 `vite.config.ts` 顶部直接读是 `undefined`（已实测）。必须用 `defineConfig(({ mode }) => ...)` + `loadEnv(mode, ...)` 才能读到 `.env.demo`。
- i18n 四种语言的 `ui.*` 键不对齐：`en-US` 缺 17 个键（`Blue`/`Delete`/`Tasks` 等），靠 `fallbackLocale: 'zh-CN'` 兜底。新增 `ui.demoDisabled` 必须四语言都补，否则英文界面会显示中文。
- `designer/env.d.ts` 的 `ImportMetaEnv` 只声明了 `BASE_URL`，新增 `VITE_DEMO` 必须同步补类型，否则 type-check 报错。
- 除 `hasSession`（`/api/auth/me`）外，`?key=xxx` URL 参数会在 `restoreOpenedProcess` 中触发 `getModel`，`submitLogin` 也会调 `login`——**后端调用不止一处**，demo 分支需覆盖这条路径。
- `designer/public/` 现有 `favicon.ico` + `sl1.png`(369KB) + `sl2.png`(325KB)，会被原样拷进构建产物；720KB 需与"首屏体积"一并考虑。

## 方案

### 已选：静态 Demo 站 + README 首屏重写 + 语言标记

分三块，互不阻塞，可分别验证。

#### 1. Demo 构建模式

新增 `pnpm build:demo`，与现有 `build` 并存：

- 通过 Vite mode（`--mode demo`）+ `.env.demo` 注入 `VITE_DEMO=true` 与 `VITE_BASE=/flowable-framework/`。
- `vite.config.ts` 改为函数式 `defineConfig(({ mode }) => ...)`，用 `loadEnv(mode, process.cwd(), '')` 读取变量（**不能**直接读 `process.env`，已实测为 `undefined`），`base` 取 `env.VITE_BASE ?? '/'`，**默认值不变**，因此现有 `pnpm build` 行为完全不受影响。
- `outDir` 在 demo 模式下切到 `designer/dist-demo`（并加入 `.gitignore`），避免覆盖后端要用的 `src/main/resources/static`。
- `build:demo` 与 `build` 一样跑 `run-p type-check build-only`，**前提是先修掉 5 处既有 `TS2322`**（见"前置修复"），使 CI 在无缓存的 runner 上也能通过类型检查。

#### 0. 前置修复：5 处既有 TypeScript 错误

`pnpm build` 当前在干净环境下必然失败，因为 `vue-tsc --build` 是增量构建：本地有 `tsbuildinfo` 缓存时跳过检查，CI 每次干净环境则全量检查并报 5 个 `TS2322`。不修则 Pages 部署必然红，且 README 里写给陌生人的 `pnpm build` 命令一开始就跑不通。

需修复的位置（均已实测）：

| 文件:行 | 问题 |
|---|---|
| `ListenerDrawer.vue:142` | `string \| string[]` 传给只接受标量的 Element Plus prop |
| `DataObjectDrawer.vue:98` | `false` 传给字符串/数字类型 prop |
| `DataObjectDrawer.vue:128` | 同上，另一处 prop |
| `EventListenerDrawer.vue:249` | 回调签名 `(rethrowEvent: boolean)` 与 `(val: string\|number\|boolean\|undefined)` 不兼容 |
| `ScriptTask/index.vue:36` | 回调签名 `(val: string)` 与 `(val: string\|number\|boolean\|undefined)` 不兼容 |

修法以**最小化、不改变运行时行为**为准：优先用窄化断言或显式转换，不改组件语义、不改 `v-model` 绑定关系。修完 `pnpm type-check` 应 0 错误。

#### 2. Demo 模式下的运行时行为

新增 `designer/src/demo.ts`，导出 `isDemoMode`（读 `import.meta.env.VITE_DEMO`，并在 `env.d.ts` 补 `readonly VITE_DEMO?: string` 声明）。改五处：

- **不弹登录框**：`index.vue` 的 `ensureLogin()` 在 demo 模式直接返回 `false`，且不设 `loginVisible = true`。
- **打开/保存改为提示**：`openDefinitions()` 与 `save()` 在 demo 模式直接 `ElMessage.warning(t('ui.demoDisabled'))` 返回。新增 i18n 文案，**四种语言都要补**（en-US 缺键会回落到中文）：
  - zh-CN：在线预览不支持打开与保存，请按 README 在本地运行完整版本
  - zh-TW / en-US / ja-JP 对应翻译
- **忽略 `?key=` 参数**：`restoreOpenedProcess()` 在 demo 模式跳过 URL 参数的 `getModel` 分支，避免访客带 `?key=leave` 时走到 `ensureLogin()` 失败 → 空白画布 + 3 个 lint 红叉。demo 下 `demo/leave.bpmn20.xml` 是唯一入口。
- **首屏加载真实流程**：`restoreOpenedProcess()` 在 demo 模式改为 `fetch(`${import.meta.env.BASE_URL}demo/leave.bpmn20.xml`)`，经现有 `xmlWithDiagram()` 自动排版后 `importDiagram()`。文件从 `src/main/resources/processes/leave.bpmn20.xml` 复制到 `designer/public/demo/`。
- **`submitLogin` 不可达**：因 `loginVisible` 在 demo 下永远为 false，该分支自然失效，无需改动，但需在验证时确认弹窗确实不出现。

> 选择加载 leave 流程而不是空白画布：空流程会触发 3 个 lint 错误红叉（已实测），首屏观感是"一进来就报错"。加载真实流程后首屏是一张完整的请假审批图，且 lint 只有可解释的警告。

#### 3. Pages 部署

新增 `.github/workflows/pages.yml`：`push` 到 `main` 且命中 `designer/**` 或该 workflow 时触发；`pnpm/action-setup` + `setup-node(20, cache: pnpm)` + `pnpm install --frozen-lockfile` + `pnpm build:demo` + `upload-pages-artifact` + `deploy-pages`。权限 `pages: write`、`id-token: write`，`concurrency` 取消进行中的旧部署。

**首次启用需人工一步**：当前 `gh` token 的 scopes 为 `gist, read:org, repo, workflow`，没有 `pages` / admin 级权限，`GET /repos/.../pages` 返回 404 说明 Pages 尚未启用。我会尝试用 `gh api` 创建，若因权限失败，则需你在仓库 Settings → Pages 把 Source 设为 **GitHub Actions**。这是唯一需要人工介入的步骤。

### 未采用的备选

- **只改 README + topics**：半小时完成，但解决不了"跑不起来"。陌生人看完仍要装 JDK+Node 才能判断项目好不好，转化率低，与本次意图不符。
- **前端 mock 后端（让打开/保存看起来可用）**：Demo 观感最完整，但会让访客误以为数据被真实保存。对一个定位为"后端框架"的项目，这种误导会损害可信度。
- **Docker / devcontainer 一键跑**：真正实现"跑起来"，但要写 Dockerfile、compose、健康检查，工作量约为本方案两倍，且对第一次接触的人门槛（先装 Docker）不比装 JDK 低。留作后续独立议题。

## 实现细节

### 文件改动清单

| 文件 | 改动 |
|------|------|
| `designer/vite.config.ts` | 改为 `defineConfig(({mode}) => ...)` + `loadEnv`；`base` / `outDir` 支持覆盖，默认值不变 |
| `designer/env.d.ts` | 补 `readonly VITE_DEMO?: string` |
| `designer/.env.demo` | 新增：`VITE_DEMO=true`、`VITE_BASE=/flowable-framework/` |
| `designer/package.json` | 新增 `build:demo`（仅 `vite build`，不含 type-check） |
| `designer/src/demo.ts` | 新增：`isDemoMode` |
| `designer/src/views/ProcessDesigner/index.vue` | `ensureLogin` / `save` / `openDefinitions` / `restoreOpenedProcess` 四处 demo 分支 |
| `designer/src/languages/langs/*` | 四语言新增 `ui.demoDisabled` |
| `designer/public/demo/leave.bpmn20.xml` | 新增（从后端资源复制） |
| `.github/workflows/pages.yml` | 新增部署流水线 |
| `.gitattributes` | 新增：`designer/** linguist-vendored`、`*.bpmn20.xml linguist-language=XML` 等 |
| `.gitignore` | 新增 `designer/dist-demo/` |
| `README.md` / `README.zh-CN.md` | 首屏重写 + 徽章 + 语言切换 + 截图前置 |
| 仓库 settings（通过 `gh`） | description 改英文、写 homepage、补 topics |

### README 首屏结构

首屏大图复用现有 `docs/images/designer-overview.png`（水墨风、完整请假流程、属性面板，最能代表项目），不新做图。

```text
[designer-overview.png 大图]
# flowable-framework
一句话：Spring Boot + Flowable 7.2 workflow backend with a built-in BPMN designer
徽章行：License | Java 21 | Spring Boot | Flowable | Live Demo
▶ Try the designer in your browser（指向 Pages）
Then: 两条命令本地跑完整版
```

英文在前，中文版保留并互相链接。另外两张截图（`designer-i18n.png`、`designer-themes.png`）保留在首屏之后、Features 之前。

### 语言标记

`.gitattributes` 加 `designer/** linguist-vendored`。效果：GitHub 语言统计排除 `designer/` 的 18K 行 TS/Vue，仓库显示为 **Java**。这样在 `spring boot`、`flowable`、`workflow` 相关检索里定位正确。

> 这是本次唯一"会改变仓库对外形象"的改动。它没有撒谎——`designer/` 确实是第三方派生代码，按 GitHub 的 vendored 定义应当排除——但会让人在语言栏看不到前端。我认为对"Java 工作流框架"这一定位更准确。

## 我的判断（可以推翻）

- Demo 首屏加载 leave 流程而非空白画布，是我基于实测（空流程 3 个错误）做的取舍；若你更希望访客从空白开始画，改一行即可。
- 首屏 750KB(gzip) 体积偏大。本次不做代码分割，因为改动会触及 designer 的构建配置，风险与本议题无关；若后续觉得慢，可单独做 vendor 拆分。
- `.gitattributes` 的 vendored 标记只影响展示，不影响 `git clone` 与构建。
- 部署只在 `main` 分支触发。若你希望用 `gh-pages` 分支方式部署，需改 workflow，我按 Actions 方式做。
- 上线后建议同步更新 `docs/images/designer-overview.png`，因为默认主题截图与当前代码可能已有细微差异；本次不重新截图。

## 验证

- `pnpm type-check` 0 错误（前置修复完成）。
- `pnpm build`（非 demo）在**删除 tsbuildinfo 的干净环境下** exit 0，仍输出到 `../src/main/resources/static`，后端 `./mvnw package` 正常。
- `pnpm build:demo` 输出到 `designer/dist-demo`，`npx vite preview` 打开后：无登录弹窗、首屏渲染 leave 流程、主题可切、语言可切、lint 可跑、点"保存"出现提示。
- 带 `?key=leave` 访问 demo 站，仍显示 leave 流程而非空白画布。
- 切到 English 后点"保存"，提示文案是英文而非中文（验证 i18n 四语言齐全）。
- 本地以 `--base=/flowable-framework/` 构建后，用 `vite preview` 验证资源路径不 404。
- Actions 跑通，Pages 站点可访问，README 徽章链接可达。
- 仓库 `languages` 接口返回 Java 为主语言。
- 浏览器控制台无未处理异常（demo 模式下不应再有 `/api/auth/me` 500 报错）。

## 交付后的观察指标

14 天内看：Pages 站点访问量、仓库 views/clones 变化、是否出现第一个外部 star 或 issue。GitHub traffic 只保留 14 天，建议届时截图存档。
