import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'path'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite 在解析 config 之后才填充 process.env，因此这里必须用 loadEnv 读 .env.* 文件
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE || '/'
  // demo 构建输出到独立目录，避免覆盖后端打包要用的 resources/static
  const outDir = env.VITE_DEMO === 'true' ? 'dist-demo' : '../src/main/resources/static'
  return {
    base,
    plugins: [
      vue(),
      vueJsx(),
      createSvgIconsPlugin({
        iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
        symbolId: 'icon-[dir]-[name]',
      }),
      AutoImport({
        imports: [
          'vue',
          'vue-router',
          { '@/languages/uiText': ['translateUi', 'translateUiHtml'] },
        ],
        resolvers: [ElementPlusResolver()],
        dts: 'src/typings/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
          filepath: './.eslintrc-auto-import.json',
        },
      }),
      Components({
        extensions: ['vue', 'tsx', 'md'],
        globs: ['src/components/*/*.vue', 'src/components/*/*.tsx', 'src/components/*/index.ts'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/, /\.[tj]sx?$/],
        resolvers: [
          ElementPlusResolver({
            importStyle: 'sass',
          }),
        ],
        dts: 'src/typings/components.d.ts',
      }),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      preprocessorOptions: {
        scss: { api: 'modern-compiler' },
      },
    },
    // 本地调试时前端单独起服务；页面请求 /api 时由开发服务器转发到 Spring Boot。
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          sanitizeFileName(name) {
            const match = /^[a-z]:/i.exec(name)
            const driveLetter = match ? match[0] : ''
            return (
              driveLetter +
              name
                .substring(driveLetter.length)
                .replace(/[\x00-\x1F\x7F<>*#"{}|^[\]`;?:&=+$,]/g, '')
            )
          },
        },
      },
    },
  }
})
