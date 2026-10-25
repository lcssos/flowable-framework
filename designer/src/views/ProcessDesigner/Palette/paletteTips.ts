// 浏览器原生 title 要停很久才出现，工具栏改成短延迟提示。

import type {
  PaletteEntries,
  PaletteEntriesCallback,
} from 'diagram-js/lib/features/palette/PaletteProvider'

const TIP_DELAY = 120

type Bus = {
  on: (event: string, handler: () => void) => void
  off: (event: string, handler: () => void) => void
}

export type PaletteEntriesSource = {
  getPaletteEntries: () => PaletteEntries | PaletteEntriesCallback
}

// 语言切换后 bpmn-js 不会重建 palette 条目，提示文案缓存在 dataset 上，
// 这里按 provider 当前语言重新生成一次
export const refreshPaletteTips = (provider: PaletteEntriesSource) => {
  const provided = provider.getPaletteEntries()
  const entries = typeof provided === 'function' ? provided({}) : provided

  document.querySelectorAll<HTMLElement>('.djs-palette .entry[data-action]').forEach((entry) => {
    const title = entries[entry.dataset.action || '']?.title
    if (title) {
      entry.dataset.tip = title
    }
  })
}

export const bindPaletteTips = (eventBus: Bus) => {
  const tip = document.createElement('div')
  tip.className = 'palette-tip'
  document.body.appendChild(tip)

  let timer = 0
  let current: HTMLElement | null = null

  const palette = () => document.querySelector<HTMLElement>('.djs-palette')

  const hide = () => {
    window.clearTimeout(timer)
    current = null
    tip.classList.remove('is-visible')
  }

  const show = (entry: HTMLElement) => {
    const box = palette()?.getBoundingClientRect()
    const entryBox = entry.getBoundingClientRect()
    if (!box) {
      return
    }
    tip.textContent = entry.dataset.tip || ''
    tip.style.left = `${box.right + 8}px`
    tip.style.top = `${entryBox.top + entryBox.height / 2}px`
    tip.classList.add('is-visible')
  }

  const arm = () => {
    palette()
      ?.querySelectorAll<HTMLElement>('.entry[title]')
      .forEach((entry) => {
        const title = entry.getAttribute('title')
        if (!title) {
          return
        }
        entry.dataset.tip = title
        entry.removeAttribute('title')
      })
  }

  const onOver = (event: Event) => {
    const entry = (event.target as HTMLElement | null)?.closest<HTMLElement>('.entry')
    if (!entry?.dataset.tip || entry === current) {
      return
    }
    current = entry
    window.clearTimeout(timer)
    if (tip.classList.contains('is-visible')) {
      show(entry)
      return
    }
    timer = window.setTimeout(() => show(entry), TIP_DELAY)
  }

  const onOut = (event: Event) => {
    const mouse = event as MouseEvent
    const entry = (mouse.target as HTMLElement | null)?.closest('.entry')
    if (!entry) {
      return
    }
    const next = (mouse.relatedTarget as HTMLElement | null)?.closest('.entry')
    if (next) {
      return
    }
    hide()
  }

  const ensure = () => {
    arm()
    const root = palette()
    if (!root || root.dataset.tipsBound) {
      return
    }
    root.dataset.tipsBound = '1'
    root.addEventListener('mouseover', onOver)
    root.addEventListener('mouseout', onOut)
    root.addEventListener('dragstart', hide)
  }

  eventBus.on('palette.changed', ensure)
  ensure()

  return () => {
    eventBus.off('palette.changed', ensure)
    hide()
    tip.remove()
    const root = palette()
    root?.removeEventListener('mouseover', onOver)
    root?.removeEventListener('mouseout', onOut)
    root?.removeEventListener('dragstart', hide)
    if (root) {
      delete root.dataset.tipsBound
    }
  }
}
