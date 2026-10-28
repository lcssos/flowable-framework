<script setup lang="ts">
import { customRef, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'

import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import 'bpmn-js-color-picker/colors/color-picker.css'
import ToggleMode from 'bpmn-js-token-simulation/lib/features/toggle-mode/modeler/ToggleMode'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import {
  CaretLeft,
  CaretRight,
  CircleCheck,
  Delete,
  FolderOpened,
  MapLocation,
  RefreshLeft,
  RefreshRight,
  Upload,
  VideoPlay,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue'
import type CommandStack from 'diagram-js/lib/command/CommandStack'
import type ContextPad from 'diagram-js/lib/features/context-pad/ContextPad'
import type Selection from 'diagram-js/lib/features/selection/Selection'
import BpmnPanel from './BpmnPanel.vue'
import BpmnDesigner from './BpmnModeler.tsx'
import EmptyXML from './EmptyXML'
import type { Injector } from 'didi'
import { nextId } from './utils/ElementUtil.ts'
import type { ElementIssue, Issues, Linting } from 'bpmn-js-bpmnlint'
import type Canvas from 'diagram-js/lib/core/Canvas'
import type { Minimap } from 'diagram-js-minimap'
import { layoutProcess } from 'bpmn-auto-layout'
import { xmlWithDiagram } from './utils/diagramLayout'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import useAppStore, { isLanguage } from '@/stores/modules/app.ts'
import { isTheme, themes } from '@/themes'
import {
  bindPaletteTips,
  refreshPaletteTips,
  type PaletteEntriesSource,
} from './Palette/paletteTips'
import { bindContextPadTips } from './ContextPad/contextPadTips'
import { customTranslate } from './Translate'
import {
  deployXml,
  getModel,
  hasSession,
  listDefinitions,
  login,
  type ProcessDefinitionSummary,
} from '@/api/processDefinitions'

defineOptions({
  name: 'ProcessDesigner',
})
const appStore = useAppStore()
const { language, theme } = storeToRefs(appStore)

// 语言名用各自母语书写，避免切换后再去翻译语言本身。
const languageOptions = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
] as const

const currentLanguageLabel = computed(
  () => languageOptions.find((item) => item.value === language.value)?.label ?? '',
)

const changeLanguage = (value: string | number | object) => {
  if (typeof value === 'string' && isLanguage(value)) {
    appStore.changeLanguage(value)
  }
}
const processKeyParam = 'key'
const { t, locale } = useI18n()
const props = defineProps<{
  id?: string
  name?: string
  xml?: string
  idPrefix?: string
}>()
const mockVisible = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      const toggleMode = modeler.value?.get<ToggleMode>('toggleMode')
      return toggleMode?._active || false
    },
    set() {
      const toggleMode = modeler.value?.get<ToggleMode>('toggleMode')
      toggleMode?.toggleMode()
      trigger()
    },
  }
})
const lintVisible = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      const linting = injector.value?.get<Linting>('linting')
      return linting?.isActive() || false
    },
    set(newValue: boolean) {
      const linting = injector.value?.get<Linting>('linting')
      linting?.toggle(newValue)
      trigger()
    },
  }
})
const mapVisible = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      const minimap = modeler.value?.get<Minimap>('minimap')
      return minimap?.isOpen() || false
    },
    set(newValue: boolean) {
      const minimap = modeler.value?.get<Minimap>('minimap')
      minimap?.toggle(newValue)
      trigger()
    },
  }
})
const zoom = customRef<number>((track, trigger) => {
  return {
    get() {
      track()
      return modeler.value?.get<Canvas>('canvas')?.zoom() || 1
    },
    set(newValue: number) {
      modeler.value?.get<Canvas>('canvas')?.zoom(newValue)
      trigger()
    },
  }
})
const rightArrow = ref(true)
const processName = ref('')
const processId = ref('')
const currentProcessKey = ref<string | null>(null)
const issuesList = ref<ElementIssue[]>([])
const modeler = ref<BpmnModeler>()
const injector = ref<Injector>()
const labelPosition = ref('left')
const loginVisible = ref(false)
const loginUsername = ref('admin')
const loginPassword = ref('test')
const openVisible = ref(false)
const definitions = ref<ProcessDefinitionSummary[]>([])
const formSize = ref('small')
const ensureLogin = async () => {
  if (await hasSession()) {
    return true
  }
  loginVisible.value = true
  return false
}
const showError = (error: unknown) => {
  ElMessage.error(error instanceof Error ? error.message : String(error))
}
const syncProcessIdentity = () => {
  const root = modeler.value?.get<Canvas>('canvas')?.getRootElement() as
    | { businessObject?: { id?: string; name?: string } }
    | undefined
  processId.value = root?.businessObject?.id || ''
  processName.value = root?.businessObject?.name || ''
}
const importDiagram = async (xml: string) => {
  modeler.value?.get<CommandStack>('commandStack').clear()
  await modeler.value?.importXML(xml)
  modeler.value?.get<Canvas>('canvas')?.zoom('fit-viewport')
  syncProcessIdentity()
}
const processKeyFromUrl = () => {
  return new URLSearchParams(window.location.search).get(processKeyParam) || null
}
currentProcessKey.value = processKeyFromUrl()
const writeProcessKey = (key: string | null) => {
  const url = new URL(window.location.href)
  if (key) {
    url.searchParams.set(processKeyParam, key)
  } else {
    url.searchParams.delete(processKeyParam)
  }
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
  currentProcessKey.value = key
}
const setTheme = (value: string | number | object) => {
  if (typeof value === 'string' && isTheme(value)) {
    theme.value = value
  }
}
const processRowClass = ({ row }: { row: ProcessDefinitionSummary }) => {
  return row.key === currentProcessKey.value ? 'is-current-process' : ''
}
const showNewProcess = async () => {
  const xml = EmptyXML(props.id || nextId('Process_'), props.name || t('ui.newProcess'))
  await importDiagram(props.xml || xml)
}
const openModel = async (key: string) => {
  const model = await getModel(key)
  await importDiagram(await xmlWithDiagram(model.xml))
  writeProcessKey(key)
}
const restoreOpenedProcess = async () => {
  if (props.xml) {
    await importDiagram(props.xml)
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
const submitLogin = async () => {
  try {
    await login(loginUsername.value, loginPassword.value)
    loginVisible.value = false
    const key = processKeyFromUrl()
    if (!key) {
      return
    }
    try {
      await openModel(key)
    } catch (error) {
      writeProcessKey(null)
      showError(error)
    }
  } catch (error) {
    showError(error)
  }
}
const openDefinitions = async () => {
  if (!(await ensureLogin())) {
    return
  }
  try {
    definitions.value = await listDefinitions()
    openVisible.value = true
  } catch (error) {
    showError(error)
  }
}
const openDefinition = async (key: string) => {
  try {
    await openModel(key)
    openVisible.value = false
  } catch (error) {
    showError(error)
  }
}
const openProcessRow = (row: ProcessDefinitionSummary) => {
  void openDefinition(row.key)
}
const save = async () => {
  if (!(await ensureLogin())) {
    return
  }
  const xml = await getXml()
  if (!xml) {
    return
  }
  try {
    const saved = await deployXml(xml)
    writeProcessKey(saved.key)
    ElMessage.success(`${t('ui.saved')} ${saved.key} v${saved.version}`)
  } catch (error) {
    showError(error)
  }
}
onMounted(() => {
  void ensureLogin()
})
onBeforeUnmount(() => {
  unbindPaletteTips?.()
  unbindContextPadTips?.()
})
const redo = () => {
  modeler.value?.get<CommandStack>('commandStack').redo()
}
const undo = () => {
  modeler.value?.get<CommandStack>('commandStack').undo()
}
const layout = async () => {
  const xml = await getXml()
  if (xml) {
    const diagramWithLayoutXML = await layoutProcess(xml)
    modeler.value?.importXML(diagramWithLayoutXML)
  }
}
const restart = () => {
  writeProcessKey(null)
  void showNewProcess()
}
const loadXml = (xml: string) => {
  modeler.value?.importXML(xml)
}
const getXml = async () => {
  const res = await modeler.value?.saveXML({ format: true, preamble: true })
  return res?.xml
}
let unbindPaletteTips: (() => void) | undefined
let unbindContextPadTips: (() => void) | undefined
const modelerReady = async (bpmnModeler: BpmnModeler) => {
  unbindPaletteTips?.()
  unbindContextPadTips?.()
  unbindPaletteTips = bindPaletteTips(bpmnModeler)
  unbindContextPadTips = bindContextPadTips(bpmnModeler)
  modeler.value = bpmnModeler
  injector.value = bpmnModeler.get<Injector>('injector')
  modeler.value?.on<{ issues: Issues }>('linting.completed', ({ issues }) => {
    issuesList.value = Object.values(issues).flat()
  })
  modeler.value?.on('commandStack.changed', syncProcessIdentity)
  await restoreOpenedProcess()
  // await bpmnModeler.createDiagram()
}
// bpmn-js 的界面文案在渲染时一次性翻译：palette 提示缓存在 dataset 上，
// 底部校验按钮及其内容由 bpmn-js-bpmnlint 生成，切换语言后都需要主动刷新
const refreshBpmnText = () => {
  const currentInjector = injector.value
  if (!currentInjector) {
    return
  }

  const paletteProvider = currentInjector.get<PaletteEntriesSource>('paletteProvider', false)
  if (paletteProvider) {
    refreshPaletteTips(paletteProvider)
  }

  currentInjector.get<Linting>('linting', false)?.update()

  // 操作小按钮浮框的条目在打开时翻译，已经打开的浮框要重新生成才会换语言
  const contextPad = currentInjector.get<ContextPad>('contextPad', false)
  const selected = currentInjector.get<Selection>('selection', false)?.get() ?? []
  const padTarget = selected.length === 1 ? selected[0] : selected
  if (contextPad && selected.length && contextPad.isOpen(padTarget)) {
    contextPad.open(padTarget, true)
  }

  // update() 只重算校验结果与按钮文案，不会重建按钮，title 仍是初始语言
  const lintButton = document.querySelector<HTMLButtonElement>('.bjs-container .bjsl-button')
  if (lintButton) {
    lintButton.title = customTranslate('Toggle linting overlays')
  }
}

// 监听实际生效的语言，而不是开关状态，避免与 store 里同步 locale 的 watch 抢顺序
watch(locale, () => {
  refreshBpmnText()
})

const validate = async () => {
  const errors = issuesList.value.filter((issue) => issue.category === 'error')
  if (errors.length) {
    return errors
  }
  return []
}
const resetZoom = () => {
  zoom.value = 1
  modeler.value?.get<Canvas>('canvas')?.zoom('fit-viewport')
}
const toggleRightArrow = () => {
  if (mockVisible.value) {
    return ElMessage.warning(t('ui.exitSimulationFirst'))
  }
  rightArrow.value = !rightArrow.value
}
provide('ProcessDesigner', {
  modeler: modeler,
})
defineExpose({
  loadXml,
  getXml,
  validate,
})
</script>

<template>
  <el-container class="design-container">
    <el-header class="design-header">
      <div class="design-brand">
        <span class="design-brand__name">{{ $t('ui.productName') }}</span>
        <span class="design-brand__process">{{ processName || $t('ui.newProcess') }}</span>
        <span v-if="processId" class="design-brand__key">{{ processId }}</span>
      </div>
      <div class="design-header__actions">
        <el-button
          class="design-action design-action--open"
          :icon="FolderOpened"
          @click="openDefinitions"
          >{{ $t('ui.open') }}</el-button
        >
        <el-button class="design-save" :icon="Upload" @click="save">{{ $t('ui.save') }}</el-button>
        <el-popover trigger="click" :width="240" placement="bottom-end">
          <template #reference>
            <el-button class="design-action design-action--display">{{ $t('ui.display') }}</el-button>
          </template>
          <div class="display-menu">
            <span>{{ $t('ui.labelPositionLeft') }}</span>
            <el-switch
              v-model="labelPosition"
              inline-prompt
              :active-text="$t('ui.labelPositionTop')"
              :inactive-text="$t('ui.labelPositionLeft')"
              active-value="top"
              inactive-value="left"
            />
            <span>{{ $t('ui.formSizeCompact') }}</span>
            <el-switch
              v-model="formSize"
              inline-prompt
              :active-text="$t('ui.formSizeDefault')"
              :inactive-text="$t('ui.formSizeCompact')"
              active-value="default"
              inactive-value="small"
            />
          </div>
        </el-popover>
        <el-dropdown trigger="click" popper-class="theme-menu" @command="setTheme">
          <el-button class="design-action design-action--theme">{{ $t('ui.theme') }}</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="item in themes"
                :key="item.id"
                :command="item.id"
                :class="{ 'is-active': theme === item.id }"
              >
                {{ $t(`ui.themes.${item.id}`) }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" popper-class="language-menu" @command="changeLanguage">
          <el-button class="design-action design-action--language" :aria-label="$t('ui.switchLanguage')">
            {{ currentLanguageLabel }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="item in languageOptions"
                :key="item.value"
                :command="item.value"
                :class="{ 'is-active': language === item.value }"
              >
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>
    <el-container style="overflow-y: auto">
      <el-container style="position: relative">
        <el-header class="design-inner__header">
          <el-space :size="10">
            <el-button-group size="small">
              <el-tooltip placement="top" :content="$t('ui.undo')">
                <el-button
                  class="design-tool design-tool--undo"
                  :icon="RefreshLeft"
                  @click="undo"
                />
              </el-tooltip>
              <el-tooltip placement="top" :content="$t('ui.redo')">
                <el-button
                  class="design-tool design-tool--redo"
                  :icon="RefreshRight"
                  @click="redo"
                />
              </el-tooltip>
            </el-button-group>
            <el-button-group size="small">
              <el-tooltip :content="$t('ui.zoomOut')" placement="top">
                <el-button
                  class="design-tool design-tool--zoom-out"
                  :icon="ZoomOut"
                  @click="zoom -= 0.1"
                  :disabled="zoom <= 0.5"
                />
              </el-tooltip>
              <el-tooltip :content="$t('ui.resetZoom')" placement="top">
                <el-button class="design-tool design-tool--zoom-reset" @click="resetZoom"
                  >{{ (zoom * 100).toFixed(0) }}%</el-button
                >
              </el-tooltip>
              <el-tooltip :content="$t('ui.zoomIn')" placement="top">
                <el-button
                  class="design-tool design-tool--zoom-in"
                  :icon="ZoomIn"
                  @click="zoom += 0.1"
                  :disabled="zoom >= 1.7"
                />
              </el-tooltip>
            </el-button-group>
            <el-button-group size="small">
              <el-tooltip placement="top" :content="$t('ui.reset')">
                <el-button class="design-tool design-tool--reset" :icon="Delete" @click="restart" />
              </el-tooltip>
              <el-tooltip
                placement="top"
                :content="$t(mockVisible ? 'ui.exitSimulation' : 'ui.startSimulation')"
              >
                <el-button
                  class="design-tool design-tool--simulate"
                  :icon="VideoPlay"
                  :class="{ 'is-active': mockVisible }"
                  @click="mockVisible = !mockVisible"
                />
              </el-tooltip>
              <el-tooltip
                placement="top"
                :content="$t(lintVisible ? 'ui.disableValidation' : 'ui.enableValidation')"
              >
                <el-button
                  class="design-tool design-tool--lint"
                  :icon="CircleCheck"
                  :class="{ 'is-active': lintVisible }"
                  @click="lintVisible = !lintVisible"
                />
              </el-tooltip>
              <el-tooltip
                placement="top"
                :content="$t(mapVisible ? 'ui.collapseMinimap' : 'ui.expandMinimap')"
              >
                <el-button
                  class="design-tool design-tool--map"
                  :icon="MapLocation"
                  :class="{ 'is-active': mapVisible }"
                  @click="mapVisible = !mapVisible"
                />
              </el-tooltip>
            </el-button-group>
          </el-space>
        </el-header>
        <el-main class="design-inner__main">
          <bpmn-designer @modeler-ready="modelerReady" />
        </el-main>
        <div class="right-panel-arrow" @click="toggleRightArrow">
          <el-icon :size="15">
            <CaretRight v-if="rightArrow && !mockVisible" />
            <CaretLeft v-else />
          </el-icon>
        </div>
      </el-container>
      <el-aside :width="rightArrow && !mockVisible ? '370px' : '0px'" class="design-aside">
        <BpmnPanel
          v-if="modeler"
          :modeler="modeler"
          :size="formSize"
          :label-position="labelPosition"
        ></BpmnPanel>
      </el-aside>
    </el-container>
    <el-dialog
      v-model="loginVisible"
      :title="$t('ui.login')"
      width="360px"
      :close-on-click-modal="false"
    >
      <el-form @submit.prevent="submitLogin">
        <el-form-item :label="$t('ui.username')">
          <el-input v-model="loginUsername" />
        </el-form-item>
        <el-form-item :label="$t('ui.password')">
          <el-input
            v-model="loginPassword"
            type="password"
            show-password
            @keyup.enter="submitLogin"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitLogin">{{ $t('ui.login') }}</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="openVisible" :title="$t('ui.openProcess')" width="560px">
      <el-table
        :data="definitions"
        height="320"
        :row-class-name="processRowClass"
        @row-click="openProcessRow"
      >
        <el-table-column prop="key" :label="$t('ui.id')" />
        <el-table-column prop="name" :label="$t('ui.name')" />
        <el-table-column prop="version" :label="$t('ui.version')" width="90" />
      </el-table>
    </el-dialog>
  </el-container>
</template>

<style scoped lang="scss">
.right-panel-arrow {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 3;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 48px;
  color: var(--el-text-color-secondary);
  background: var(--designer-panel, var(--el-bg-color));
  border: 1px solid var(--el-border-color);
  border-right: none;
  border-radius: 6px 0 0 6px;
  cursor: pointer;
}

.design-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--designer-paper, var(--el-bg-color-page));

  .design-header {
    height: 56px;
    padding: 0 16px;
    border-bottom: 1px solid var(--el-border-color);
    background: var(--designer-chrome-fill, var(--el-bg-color));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .design-inner__header {
    height: 44px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--el-border-color);
    background: var(--designer-chrome-fill, var(--el-bg-color));
  }

  .design-inner__main {
    padding: 0;
    height: 100%;
    background: var(--designer-canvas, var(--el-bg-color));
  }

  .design-aside {
    border-left: 1px solid var(--el-border-color);
    box-shadow: none;
    transition: width 0.2s ease;
    background: var(--designer-panel-fill, var(--el-bg-color));
  }
}

.design-brand {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 10px;
}

.design-brand__name {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.design-brand__process {
  overflow: hidden;
  font-size: 14px;
  color: var(--el-text-color-regular);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.design-brand__key {
  flex: none;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.design-header__actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
}

.design-save {
  --el-button-bg-color: var(--designer-save);
  --el-button-border-color: var(--designer-save);
  --el-button-hover-bg-color: var(--designer-save-hover);
  --el-button-hover-border-color: var(--designer-save-hover);
  --el-button-text-color: #fff;
  --el-button-hover-text-color: #fff;
}

.display-menu {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px 16px;
  align-items: center;
}

.design-inner__header :deep(.is-active) {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

:deep(.is-current-process) {
  background: var(--el-color-primary-light-9);
  cursor: pointer;
}

.canvas {
  width: 100%;
  height: 100%;
}
</style>
