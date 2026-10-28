// 浏览器原生 title 要停将近一秒才出现，选中节点/连线后的操作小按钮改成短延迟提示。
// 与 Palette/paletteTips.ts 的区别：浮框每次打开都会重建 DOM，所以事件挂在 document 上做委托。

const TIP_DELAY = 120
const ENTRY_SELECTOR = '.djs-context-pad .entry'

type Bus = {
  on: (event: string, handler: () => void) => void
  off: (event: string, handler: () => void) => void
}

export const bindContextPadTips = (eventBus: Bus) => {
  const tip = document.createElement('div')
  tip.className = 'context-pad-tip'
  document.body.appendChild(tip)

  let timer = 0
  let current: HTMLElement | null = null

  const hide = () => {
    window.clearTimeout(timer)
    current = null
    tip.classList.remove('is-visible')
  }

  const show = (entry: HTMLElement) => {
    const box = entry.getBoundingClientRect()
    tip.textContent = entry.dataset.tip || ''
    // 提示以按钮中心为锚点居中；按钮贴近窗口边缘时把锚点收回，避免提示被裁掉。
    const half = tip.offsetWidth / 2 + 4
    const center = box.left + box.width / 2
    tip.style.left = `${Math.min(Math.max(center, half), window.innerWidth - half)}px`
    tip.style.top = `${box.top - 8}px`
    tip.classList.add('is-visible')
  }

  const entryOf = (target: EventTarget | null) =>
    target instanceof Element ? target.closest<HTMLElement>(ENTRY_SELECTOR) : null

  const onOver = (event: MouseEvent) => {
    const entry = entryOf(event.target)
    if (!entry || entry === current) {
      return
    }
    // 把 title 搬到 dataset 上，否则原生提示仍会在自定义提示之后再弹一次。
    const title = entry.getAttribute('title')
    if (title) {
      entry.dataset.tip = title
      entry.removeAttribute('title')
    }
    if (!entry.dataset.tip) {
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

  const onOut = (event: MouseEvent) => {
    if (entryOf(event.target) && !entryOf(event.relatedTarget)) {
      hide()
    }
  }

  document.addEventListener('mouseover', onOver)
  document.addEventListener('mouseout', onOut)
  // 开始拖拽（如拖出新节点）或浮框关闭时，提示不应残留在画布上。
  document.addEventListener('mousedown', hide)
  eventBus.on('contextPad.close', hide)
  eventBus.on('elements.changed', hide)

  return () => {
    document.removeEventListener('mouseover', onOver)
    document.removeEventListener('mouseout', onOut)
    document.removeEventListener('mousedown', hide)
    eventBus.off('contextPad.close', hide)
    eventBus.off('elements.changed', hide)
    hide()
    tip.remove()
  }
}
