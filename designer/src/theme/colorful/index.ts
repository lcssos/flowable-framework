// 多彩主题包入口：样式、调色板、渲染器都在本目录内，外部只需登记主题 id。
import './colorful.scss'

export { default as ColorfulRenderer, patchColorfulTaskSize } from './renderer'
export { COLORFUL_ID } from './tokens'
