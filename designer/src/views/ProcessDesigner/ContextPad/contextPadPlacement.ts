import type Canvas from 'diagram-js/lib/core/Canvas'
import type EventBus from 'diagram-js/lib/core/EventBus'
import type { ContextPadTarget } from 'diagram-js/lib/features/context-pad/ContextPad'
import type { Element } from 'diagram-js/lib/model/Types'

// 与 diagram-js 的 CONTEXT_PAD_MARGIN 一致，翻转后与元素保留同样的间距
const PAD_GAP = 8
// 与 .djs-context-pad 的内边距保持一致，定位时抵消掉，让按钮视觉上紧贴元素
const PAD_PADDING = 4
// 卡片与画布边缘的安全距离，避免贴边或被属性面板遮挡
const SAFE_MARGIN = 8

interface ContextPadOpenEvent {
  current: {
    html: HTMLElement
    target: ContextPadTarget
  }
}

interface ElementClickEvent {
  element: Element
  originalEvent: MouseEvent
}

interface Point {
  x: number
  y: number
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

interface Waypoint {
  x: number
  y: number
}

interface Geometry {
  left: number
  top: number
  anchorLeft: number
  anchorTop: number
  gap: number
}

/**
 * context pad 改为自适应宽度后，diagram-js 的固定偏移定位既会溢出画布，
 * 也会在连接线上把卡片放到远离点击位置的一端。这里完全接管 left/top：
 * 形状贴着元素右上角，连接线贴着实际点击点（无点击坐标时取路径中点），
 * 再用 MutationObserver 纠正 diagram-js 在缩放/平移后写回的位置。
 */
export default class ContextPadPlacement {
  static $inject: string[] = ['eventBus', 'canvas']

  private readonly canvas: Canvas
  private pad: HTMLElement | null = null
  private target: ContextPadTarget | null = null
  private anchorClick: { elementId: string; point: Point } | null = null
  private observer: MutationObserver | null = null

  constructor(eventBus: EventBus, canvas: Canvas) {
    this.canvas = canvas

    eventBus.on('contextPad.open', (event: ContextPadOpenEvent) => {
      this.attach(event.current.html, event.current.target)
    })

    eventBus.on('contextPad.close', () => {
      this.detach()
    })

    // 记录点击坐标，让流程线的卡片出现在用户实际点击的位置
    eventBus.on('element.click', (event: ElementClickEvent) => {
      const originalEvent = event.originalEvent
      if (!originalEvent) {
        this.anchorClick = null
        return
      }

      this.anchorClick = {
        elementId: event.element.id,
        point: { x: originalEvent.clientX, y: originalEvent.clientY },
      }

      this.apply()
    })

    // diagram-js 会在缩放/平移后重写 left/top，observer 会捕捉到并再次纠正
    eventBus.on('canvas.viewbox.changed', () => {
      this.apply()
    })
  }

  private attach(pad: HTMLElement, target: ContextPadTarget) {
    this.detach()
    this.pad = pad
    this.target = target
    pad.style.transform = ''

    this.observer = new MutationObserver(() => {
      this.apply()
    })
    this.observer.observe(pad, { attributes: true, attributeFilter: ['style'] })

    this.apply()
  }

  private detach() {
    this.observer?.disconnect()
    this.observer = null
    this.pad = null
    this.target = null
  }

  private apply() {
    const pad = this.pad
    const target = this.target
    if (!pad || !target) {
      return
    }

    const width = pad.offsetWidth
    const height = pad.offsetHeight
    if (!width || !height) {
      return
    }

    const containerRect = this.canvas.getContainer().getBoundingClientRect()
    const geometry = this.getGeometry(target, containerRect)
    if (!geometry) {
      return
    }

    const rightLimit = containerRect.width - SAFE_MARGIN
    const bottomLimit = containerRect.height - SAFE_MARGIN
    let left = geometry.left
    let top = geometry.top

    if (left + width > rightLimit) {
      // 右侧空间不足时优先翻到锚点左侧，仍然放不下就内收到右边界
      const flippedLeft = geometry.anchorLeft - width - geometry.gap
      left = flippedLeft >= SAFE_MARGIN ? flippedLeft : rightLimit - width
    }

    if (top + height > bottomLimit) {
      const flippedTop = geometry.anchorTop - height - geometry.gap
      top = flippedTop >= SAFE_MARGIN ? flippedTop : bottomLimit - height
    }

    left = Math.max(SAFE_MARGIN, Math.round(left))
    top = Math.max(SAFE_MARGIN, Math.round(top))

    const nextLeft = `${left}px`
    const nextTop = `${top}px`
    if (pad.style.left === nextLeft && pad.style.top === nextTop) {
      return
    }

    pad.style.left = nextLeft
    pad.style.top = nextTop
  }

  private getGeometry(target: ContextPadTarget, containerRect: DOMRect): Geometry | null {
    const elements = Array.isArray(target) ? target : [target]

    if (elements.length === 1) {
      const element = elements[0]
      const waypoints = (element as { waypoints?: Waypoint[] }).waypoints
      if (waypoints?.length) {
        return this.getConnectionGeometry(element, waypoints, containerRect)
      }
    }

    const bounds = this.getBounds(elements, containerRect)
    if (!bounds) {
      return null
    }

    const gap = PAD_GAP * this.canvas.zoom()
    return {
      left: bounds.right + gap - PAD_PADDING,
      top: bounds.top - PAD_PADDING,
      anchorLeft: bounds.left,
      anchorTop: bounds.top,
      gap,
    }
  }

  private getConnectionGeometry(
    element: Element,
    waypoints: Waypoint[],
    containerRect: DOMRect,
  ): Geometry {
    const viewbox = this.canvas.viewbox()
    const points = waypoints.map((point) => ({
      x: point.x * viewbox.scale - viewbox.x * viewbox.scale,
      y: point.y * viewbox.scale - viewbox.y * viewbox.scale,
    }))
    const gap = PAD_GAP * viewbox.scale

    // 只有记录的点击确实发生在这条线上时才用点击坐标，避免框选等场景沿用旧坐标
    const click = this.anchorClick
    const anchor =
      click && click.elementId === element.id
        ? {
            x: click.point.x - containerRect.left,
            y: click.point.y - containerRect.top,
          }
        : getPathMiddle(points)

    return {
      left: anchor.x + gap - PAD_PADDING,
      top: anchor.y - PAD_PADDING,
      anchorLeft: anchor.x,
      anchorTop: anchor.y,
      gap,
    }
  }

  private getBounds(elements: Element[], containerRect: DOMRect): Rect | null {
    const viewbox = this.canvas.viewbox()
    const scale = viewbox.scale

    const rects = elements.reduce<Rect[]>((result, element) => {
      // 用元素几何而不是 gfx 包围盒：后者含标签与外描边，长名称节点会把卡片推远
      const shape = element as {
        x?: number
        y?: number
        width?: number
        height?: number
      }
      if (
        typeof shape.x === 'number' &&
        typeof shape.y === 'number' &&
        typeof shape.width === 'number' &&
        typeof shape.height === 'number'
      ) {
        const left = shape.x * scale - viewbox.x * scale
        const top = shape.y * scale - viewbox.y * scale
        result.push({
          left,
          top,
          right: left + shape.width * scale,
          bottom: top + shape.height * scale,
        })
        return result
      }

      const gfx = this.canvas.getGraphics(element.id)
      if (!gfx) {
        return result
      }

      const rect = gfx.getBoundingClientRect()
      result.push({
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top,
        right: rect.right - containerRect.left,
        bottom: rect.bottom - containerRect.top,
      })
      return result
    }, [])

    if (!rects.length) {
      return null
    }

    return rects.reduce((acc, rect) => ({
      left: Math.min(acc.left, rect.left),
      top: Math.min(acc.top, rect.top),
      right: Math.max(acc.right, rect.right),
      bottom: Math.max(acc.bottom, rect.bottom),
    }))
  }
}

// 多段线的中点：按各段长度取累计半程位置，长线也不会把卡片甩到一端
function getPathMiddle(points: Point[]): Point {
  if (points.length <= 1) {
    return points[0] ?? { x: 0, y: 0 }
  }

  const lengths: number[] = []
  let total = 0
  for (let index = 1; index < points.length; index++) {
    const length = Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    )
    lengths.push(length)
    total += length
  }

  let remaining = total / 2
  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]
    if (remaining <= length) {
      const ratio = length ? remaining / length : 0
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
        y: points[index].y + (points[index + 1].y - points[index].y) * ratio,
      }
    }
    remaining -= length
  }

  return points[points.length - 1]
}
