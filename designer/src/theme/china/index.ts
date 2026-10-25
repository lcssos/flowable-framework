// 国风主题（水墨）包入口：样式、调色板、渲染器都在本目录内，外部只需登记主题 id。
// 图标与绘制引擎等公共部分在 theme/shared。
import './china.scss'

export { default as ChinaRenderer, patchChinaTaskSize } from './renderer'
export { CHINA_ID } from './tokens'
