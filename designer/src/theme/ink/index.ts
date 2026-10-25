// 墨蓝主题包入口：样式、调色板、渲染器都在本目录内，外部只需登记主题 id。
// 图标与绘制引擎等公共部分在 theme/shared。
import './ink.scss'

export { default as InkRenderer, patchInkTaskSize } from './renderer'
export { INK_ID } from './tokens'
