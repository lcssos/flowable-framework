# 多彩主题节点按实例取色 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 colorful 主题下每个节点按实例取色，颜色不再表达 BPMN 类型，且同一节点颜色稳定不变。

**Architecture:** 新增一个纯函数模块负责「色板 + id 哈希 + 连线避让」，渲染器只负责缓存和调用。任务、事件、网关统一走同一套取色，旧的按类型色表删除。

**Tech Stack:** Vue 3 + TypeScript + bpmn-js（diagram-js Renderer 扩展），无测试框架。

**Spec:** `docs/superpowers/specs/2026-10-27-colorful-per-node-colors-design.md`

## Global Constraints

- 只改 `designer/src/theme/colorful/` 下的文件，不触碰其他主题与公共渲染器。
- 颜色必须是浅填充 + 深描边，保证深色文字可读；图标色跟随描边或使用同色系深色。
- 不修改 BPMN 模型数据，不新增依赖。
- 代码风格服从 Prettier：无分号、单引号、行宽 100。
- 注释使用简体中文，解释业务原因，不叙述代码行为。
- 项目无自动化测试，验证手段为 `pnpm type-check`、`pnpm build-only` 和浏览器实际操作。

## Review Focus

- **节点 id 异常**（空串、含 `-`/`_`/中文）：哈希不能抛错，同一 id 必须稳定落到同一色。
- **色板回绕**：避让顺延必须对色板长度取模，不能越界或死循环。
- **重新导入**：保存后刷新、切换主题再切回，颜色必须一致；`import.done` 必须清空缓存。
- **无连线节点**：没有 incoming/outgoing 时避让要安全跳过，不能报错。
- **非 shape 元素**：形状取色只应在 `drawShape` 里发生，连线走原有 `flowColor`，不能被新逻辑影响。

---

### Task 1: 新增节点取色模块

**Files:**
- Create: `designer/src/theme/colorful/node-paints.ts`
- Test: 无（项目无测试框架，用 `pnpm type-check` 验证）

**Interfaces:**
- Consumes: `NodePaint`（`./tokens` 中已有类型：`{ fill: string; edge: string; icon?: string }`）
- Produces:
  - `NODE_PAINTS: NodePaint[]`（12 组）
  - `paintIndex(id: string): number`
  - `pickNodePaint(element: Element, painted: Map<string, NodePaint>): NodePaint`
  - `assignPaints(shapes: Element[]): Map<string, NodePaint>`（按 id 排序后统一分配）

- [ ] **Step 1: 创建 `node-paints.ts`，定义 12 组色板**

复用现有调色板里已经调好的配色，按色相去重后固定顺序：

```ts
export const NODE_PAINTS: NodePaint[] = [
  { fill: '#D9E9FB', edge: '#2C6FA6', icon: '#1E5C8F' },
  { fill: '#D3F0EA', edge: '#21897A', icon: '#1A6A5E' },
  { fill: '#E8E0FB', edge: '#6A4EBD', icon: '#543BA6' },
  { fill: '#FBDDE9', edge: '#B2477B', icon: '#8F3462' },
  { fill: '#E7F4D1', edge: '#6A9629', icon: '#557A1D' },
  { fill: '#FCE7CF', edge: '#C2741C', icon: '#9A5A12' },
  { fill: '#DCE3FB', edge: '#4759C0', icon: '#364499' },
  { fill: '#FADCE0', edge: '#AE454E', icon: '#8B363E' },
  { fill: '#D6F0F2', edge: '#2A8E9A', icon: '#1F6F79' },
  { fill: '#FBEBCC', edge: '#BF8A12', icon: '#8A6309' },
  { fill: '#E7DEFA', edge: '#7752C0', icon: '#5A3E92' },
  { fill: '#DDE8F3', edge: '#3F6E93', icon: '#2F5570' },
]
```

- [ ] **Step 2: 实现 `paintIndex`**

FNV-1a 32 位哈希后对 `NODE_PAINTS.length` 取模；输入为空字符串时返回落在色板范围内的有效索引（不返回 NaN 或越界值）。

- [ ] **Step 3: 实现 `pickNodePaint`**

签名如上，行为：

1. 以 `paintIndex(element.id)` 作为起点。
2. 收集已分配的邻居：连线两端（`element.incoming` 的 `source`、`element.outgoing` 的 `target`），以及贴附关系（`host`、`attachers`，边界事件与宿主同色会像长在一起），从 `painted` 里取颜色。
3. 若候选色与任一邻居同色，`index = (index + 1) % NODE_PAINTS.length`，最多顺延一整圈。
4. 返回最终色。
5. 另导出 `assignPaints(shapes)`：按 id 排序后依次取色，后分配的一端必然避开已分配的一端，用于导入完成后按完整图重算（导入时形状先画、连线后建，绘制阶段拿不到邻居）。

- [ ] **Step 4: 验证类型**

Run: `cd designer && pnpm type-check`
Expected: 不出现 `node-paints.ts` 相关错误（仍允许既有的 5 个 `Panel/` 错误）。

---

### Task 2: 渲染器接入并清理旧色表

**Files:**
- Modify: `designer/src/theme/colorful/renderer.ts`
- Modify: `designer/src/theme/colorful/tokens.ts`

**Interfaces:**
- Consumes: Task 1 的 `pickNodePaint`、`assignPaints`、`NodePaint`
- Produces: 无新导出；`ColorfulRenderer` 行为变化

- [ ] **Step 1: `renderer.ts` 接入实例取色**

- 删除 `taskPaint`、`eventPaint`、`gatewayPaint` 三个按类型取色的函数，形状颜色统一走 `paintFor`。
- 在 `ColorfulRenderer` 内新增 `private readonly nodePaints = new Map<string, NodePaint>()`。
- 新增私有方法 `paintFor(element: Element): NodePaint`：缓存命中直接返回；否则调用 `pickNodePaint(element, this.nodePaints)`、写入缓存并返回（绘制阶段拿不到邻居，先取临时色）。
- 构造函数里监听 `import.done` 调用 `reassignPaints()`：用 `assignPaints` 按完整图重算，只重绘颜色发生变化的节点；监听 `elements.delete` 清理缓存。
- `drawShape` 改用 `this.paintFor(element)`。

- [ ] **Step 2: 清理 `tokens.ts` 中不再使用的导出**

删除 `TASK_PAINTS`、`EVENT_HUES`、`GATEWAY_PAINTS`、`blendHex` 及其辅助 `readHex`；保留 `COLORFUL_ID`、`isColorfulTheme`、`NodePaint`、`TaskPaint`（若无人使用一并删除）、`COLORFUL`、`FLOW_COLORS`。

- [ ] **Step 3: 类型检查与构建**

Run: `cd designer && pnpm type-check`
Expected: 仅剩既有的 5 个 `Panel/` 错误。

Run: `cd designer && pnpm build-only --outDir /tmp/designer-colorful-build --emptyOutDir`
Expected: `✓ built`，无未使用导出报错。

- [ ] **Step 4: 浏览器验证**

在 5173 开发服务器上切到 colorful 主题：

1. 新建流程图并放 5 个以上用户任务，确认颜色互不相同。
2. 保存 → 刷新 → 重新打开，确认每个节点颜色不变。
3. 切到 ink 再切回 colorful，确认颜色不变。
4. 截图检查文字与图标对比度。

Expected: 四个检查全部通过；任一失败则回到 Step 1 修正。

- [ ] **Step 5: 提交**

```bash
git add designer/src/theme/colorful/node-paints.ts designer/src/theme/colorful/renderer.ts designer/src/theme/colorful/tokens.ts docs/superpowers/specs/2026-10-27-colorful-per-node-colors-design.md docs/superpowers/plans/2026-10-27-colorful-per-node-colors.md
git commit -m "feat: 多彩主题改为按节点实例取色"
```
