<div align="center">
    <h1>vue-bpmn-designer</h1>
    <p>BPMN process designer (Flowable edition)</p>
    <p>
      <strong>English</strong> | <a href="./README.zh-CN.md">简体中文</a>
    </p>
</div>

---

> **Fork notice**: this copy lives inside the `flowable-framework` repository and has
> been modified from the upstream project. Upstream: [tsai996/vue-bpmn-designer](https://github.com/tsai996/vue-bpmn-designer)
> (Apache-2.0, Copyright © 2026 tsai996). See [`../NOTICE`](../NOTICE) for the list of
> modifications and the upstream attribution that must be preserved.

## Online Preview

- Upstream preview (unmodified project): https://tsai996.github.io/vue-bpmn-designer/

Modern BPMN designer built with **Vue 3** + **Vite 6** + **TypeScript**.
This project deeply integrates `bpmn-js` and provides Flowable-focused customization for diagram modeling, property editing, and BPMN lint validation out of the box.

## ✨ Features

- **⚡️ Modern Stack**: Vue 3 (Composition API), Vite 6, TypeScript
- **🎨 UI System**: Based on Element Plus and SCSS
- **⚙️ Deep Bpmn-js Integration**:
  - Built-in `bpmn-js` with Flowable syntax support
  - Real-time linting via `bpmn-js-bpmnlint`
  - Process simulation via `bpmn-js-token-simulation`
  - Extra plugins such as grid background and mini-map (`diagram-js-minimap`)
- **💻 Embedded Code Editor**: Built-in CodeMirror 6 for advanced script/config editing
- **🧩 Developer Experience**:
  - `unplugin-auto-import` + `unplugin-vue-components` for auto imports
  - ESLint + Prettier integrated

## Related Project

- If you are interested in a DingTalk-style flow designer: [lowflow-design](https://gitee.com/cai_xiao_feng/lowflow-design)

## Repository Mirrors

- Gitee: https://gitee.com/cai_xiao_feng/vue-bpmn-designer
- GitHub: https://github.com/tsai996/vue-bpmn-designer

## 🖼️ Screenshots

Screenshots of this (modified) designer live in the repository root:
[overview](../docs/images/designer-overview.png) ·
[multi-language](../docs/images/designer-i18n.png) ·
[themes](../docs/images/designer-themes.png). See the
[root README](../README.md#screenshots) for the full description.

The `public/sl1.png` / `public/sl2.png` files are kept from upstream and show the
**original** UI before this fork's redesign; they are not representative of the
current interface.

## 📦 Installation

Use `pnpm` as package manager.

```bash
# clone repository
git clone https://github.com/tsai996/vue-bpmn-designer.git

# enter project
cd vue-bpmn-designer

# install dependencies
pnpm install
```

## 🚀 Scripts

```bash
# run the dev server at http://localhost:5173
# /api is proxied to the backend at http://localhost:8080 (start Spring Boot first)
pnpm dev

# build for development
pnpm build:dev

# build for testing
pnpm build:test

# build for production (with type checking)
pnpm build:prod
# or
pnpm build

# preview local build
pnpm preview

# type check
pnpm type-check

# lint and format
pnpm lint
pnpm format
```

## 🛠️ Project Structure

```text
├── public/                 # static assets
├── src/                    # source root
│   ├── assets/             # static resources (icons, styles)
│   ├── components/         # base and business components
│   ├── typings/            # TS type declarations and generated d.ts files
│   ├── App.vue             # root component
│   └── main.ts             # app entry
├── .env.*                  # multi-environment configs
├── AGENTS.md               # AI collaboration constraints
├── eslint.config.ts        # ESLint 9 config
├── vite.config.ts          # Vite config
└── package.json            # scripts and dependencies
```

## ⚠️ Important Notes

1. **Auto Imports**: This project uses `unplugin`-based auto import heavily. Do **not** manually import Vue core APIs (`ref`, `computed`, etc.) or Element Plus components.
2. **Bpmn-js Engine**: For BPMN model updates, always use command APIs such as `modeling.updateProperties`. Do **not** mutate DOM or business objects directly, otherwise Undo/Redo may break.
3. **AI Rules**: Check `AGENTS.md` for project-specific AI development constraints.

## 📄 License

[Apache-2.0 License](./LICENSE)
