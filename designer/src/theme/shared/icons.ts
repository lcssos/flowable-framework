// 主题公共图标库：基础图形与墨蓝/琥珀/多彩各主题共用一套，靠 data-theme 选择器归属到具体主题。
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

const person =
  '<circle cx="12" cy="8" r="2.6" fill="#000" stroke="none"/>' +
  '<path d="M6.4 19c.5-3.2 2.7-4.9 5.6-4.9s5.1 1.7 5.6 4.9c.1.5-.3.9-.8.9H7.2c-.5 0-.9-.4-.8-.9z" fill="#000" stroke="none"/>'

const gear =
  '<circle cx="12" cy="12" r="2.2"/>' +
  '<path d="M12 4.2v2.1M12 17.7v2.1M4.2 12h2.1M17.7 12h2.1M6.5 6.5l1.5 1.5M16 16l1.5 1.5M17.5 6.5 16 8M8 16l-1.5 1.5"/>'

const envelope = '<path d="M8.2 10.2h7.6v4.6H8.2z"/><path d="M8.2 10.4 12 13l3.8-2.6"/>'
const clock = '<circle cx="12" cy="12" r="3.3"/><path d="M12 10.2V12l1.3 1"/>'
const signal = '<path d="M12 8.6 15.2 15H8.8z"/>'
const error = '<path d="M9.2 15.2 14.8 8.8M14.2 15.2 8.6 8.8"/>'
const escalation = '<path d="M12 8.4 14.6 15H12.8l-.8-2.2h-2.2"/><path d="M10.6 15h2.2"/>'
const condition = '<path d="M9 9.2h6v6.2H9zM9.6 11.2h4.8M9.6 13.2h4.8"/>'
const link =
  '<path d="M9.2 13.4 11 15.2a2 2 0 0 0 2.8 0l.2-.2M14.8 10.6 13 8.8a2 2 0 0 0-2.8 0l-.2.2M10.6 13.4l2.8-2.8"/>'
const compensate = '<path d="M14.6 9.2 10.2 12l4.4 2.8zM10.4 9.2 6 12l4.4 2.8z"/>'
const cancel = '<path d="M9 9l6 6M15 9l-6 6"/>'
const terminate = '<circle cx="12" cy="12" r="3.1" fill="#000" stroke="none"/>'
const multiple = '<path d="M12 8.4 15.4 10.6 14.2 14.6H9.8L8.6 10.6z"/>'
const parallel = '<path d="M12 8.6v6.8M8.6 12h6.8"/>'
const xor = '<path d="M8.4 8.4 15.6 15.6M15.6 8.4 8.4 15.6"/>'
const ring = (dashed = false) =>
  `<circle cx="12" cy="12" r="8" stroke-width="1.15"${dashed ? ' stroke-dasharray="2.2 1.8"' : ''}/>`
const endRing = '<circle cx="12" cy="12" r="7.2" stroke-width="1.7"/>'
const doubleRing = `${ring()}<circle cx="12" cy="12" r="5.3"/>`
const diamond = '<path d="M12 3.6 20.4 12 12 20.4 3.6 12z"/>'

const eventSymbol: Record<string, string> = {
  none: '',
  message: envelope,
  timer: clock,
  condition,
  signal,
  error,
  escalation,
  compensation: compensate,
  link,
  cancel,
  terminate,
  multiple,
  parallel,
}

const eventIcon = (frame: string, symbol: string) => svg(`${frame}${symbol}`)

const icons: Record<string, string> = {
  'hand-tool': svg(
    '<path d="M9 11.5V7.2a1.2 1.2 0 0 1 2.4 0V11M11.4 8.2a1.2 1.2 0 0 1 2.4 0V12M13.8 9.2a1.2 1.2 0 0 1 2.4 0v4.2c0 2.6-1.6 4.6-4.4 4.6-2 0-3.2-.8-4.2-2.2L8 13.2a1.4 1.4 0 0 1 2.2-1.6l.4.5"/>',
  ),
  'lasso-tool': svg('<path d="M8 7.5h6.2a3 3 0 0 1 0 6H10"/><path d="M9.2 16.2 7.4 13.4h3.2z"/>'),
  'space-tool': svg(
    '<path d="M12 5.5v13M8.2 8.2 12 5.2l3.8 3M8.2 15.8 12 18.8l3.8-3M5.5 12h13M8.2 9.2 5.2 12l3 2.8M15.8 9.2 18.8 12l-3 2.8"/>',
  ),
  'connection-multi': svg('<path d="M5 12h9"/><path d="M11.2 8.2 16.2 12 11.2 15.8"/>'),
  trash: svg('<path d="M8 8.5h8M9.2 8.5V7.4h5.6v1.1M9.4 8.5l.5 8.2h4.2l.5-8.2"/>'),
  'screw-wrench': svg(
    '<path d="M14.8 6.2a2.4 2.4 0 0 0-3.2 3.1L6.2 14.7a1.6 1.6 0 0 0 2.2 2.2l5.4-5.4a2.4 2.4 0 0 0 3.1-3.2L15 10.2 13.8 9z"/>',
  ),
  'user-task': svg(`<g transform="translate(1.4 0.2) scale(.9)">${person}</g>`),
  'service-task': svg(`<g transform="translate(1 1) scale(.92)">${gear}</g>`),
  task: svg('<rect x="6.2" y="8" width="11.6" height="8" rx="2.4" fill="#000" stroke="none"/>'),
  'task-none': svg(
    '<rect x="6.2" y="8" width="11.6" height="8" rx="2.4" fill="#000" stroke="none"/>',
  ),
  'script-task': svg('<path d="M7 8.5h10M7 12h10M7 15.5h6"/>'),
  'send-task': svg('<path d="M6 12h8.5M11.2 8.4 15.6 12 11.2 15.6"/>'),
  'receive-task': svg('<path d="M18 12H9.5M13 8.4 8.6 12 13 15.6"/>'),
  'manual-task': svg('<path d="M7.5 15.2c1.8-3 7.2-3 9 0"/><circle cx="12" cy="9.2" r="1.7"/>'),
  'business-rule': svg('<path d="M7 8.5h10M7 12h10M7 15.5h6"/>'),
  'business-rule-task': svg('<path d="M7 8.5h10M7 12h10M7 15.5h6"/>'),
  'call-activity': svg('<rect x="6" y="7.6" width="12" height="8.8" rx="2.6" stroke-width="1.6"/>'),
  'subprocess-expanded': svg('<path d="M12 8v8M8 12h8"/>'),
  'subprocess-collapsed': svg('<path d="M12 8v8M8 12h8"/>'),
  participant: svg('<path d="M5 6.5h14v11H5zM8 6.5v11"/>'),
  lane: svg('<path d="M5 6.5h14v11H5zM8 6.5v11"/>'),
  'text-annotation': svg('<path d="M10 6.5H7.5v11H10M7.5 12H14"/>'),
  'gateway-none': svg(`${diamond}${xor}`),
  'gateway-xor': svg(`${diamond}${xor}`),
  'gateway-parallel': svg(`${diamond}${parallel}`),
  'gateway-or': svg(`${diamond}<circle cx="12" cy="12" r="2.6"/>`),
  'gateway-complex': svg(`${diamond}<path d="M12 8.8v6.4M9.2 10.2l5.6 3.6M14.8 10.2 9.2 13.8"/>`),
  'gateway-eventbased': svg(`${diamond}<circle cx="12" cy="12" r="3.1"/>${multiple}`),
  'start-event-none': eventIcon(ring(), ''),
  'intermediate-event-none': eventIcon(doubleRing, ''),
  'end-event-none': eventIcon(endRing, ''),
}

const eventNames = [
  'message',
  'timer',
  'condition',
  'signal',
  'error',
  'escalation',
  'compensation',
  'link',
  'cancel',
  'terminate',
  'multiple',
  'parallel-multiple',
]

eventNames.forEach((name) => {
  const symbol = eventSymbol[name === 'parallel-multiple' ? 'parallel' : name] || ''
  icons[`start-event-${name}`] = eventIcon(ring(), symbol)
  icons[`end-event-${name}`] = eventIcon(endRing, symbol)
  icons[`intermediate-event-catch-${name}`] = eventIcon(doubleRing, symbol)
  icons[`intermediate-event-throw-${name}`] = eventIcon(doubleRing, symbol)
  icons[`start-event-non-interrupting-${name}`] = eventIcon(ring(true), symbol)
  icons[`intermediate-event-catch-non-interrupting-${name}`] = eventIcon(ring(true), symbol)
})

const aliases: Record<string, string> = {
  user: 'user-task',
  service: 'service-task',
  send: 'send-task',
  receive: 'receive-task',
  manual: 'manual-task',
  script: 'script-task',
}
Object.entries(aliases).forEach(([name, source]) => {
  icons[name] = icons[source]
})

// 图标以 currentColor 做遮罩，颜色由使用方决定，因此同一套图标可以供多个主题复用。
// styleKey 默认按主题 id 派生，主题需要独立图标表时可自行传入。
export const installThemeIcons = (themeId: string, styleKey = `${themeId}-icons`) => {
  const selector = `style[data-${styleKey}]`
  let style = document.head.querySelector<HTMLStyleElement>(selector)
  if (!style) {
    style = document.createElement('style')
    style.setAttribute(`data-${styleKey}`, 'true')
    document.head.appendChild(style)
  }
  style.textContent = Object.entries(icons)
    .map(([name, markup]) => {
      const uri = `data:image/svg+xml,${encodeURIComponent(markup)}`
      return (
        `html[data-theme='${themeId}'] .bpmn-icon-${name}:before{` +
        `content:'';width:1em;height:1em;background-color:currentColor;` +
        `-webkit-mask:url("${uri}") center/contain no-repeat;` +
        `mask:url("${uri}") center/contain no-repeat}`
      )
    })
    .join('')
}


