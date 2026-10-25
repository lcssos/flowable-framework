// 暖色（琥珀）主题包入口：样式、调色板、图标、渲染器都在本目录内，外部只需登记主题 id。
import './amber.scss'

export { default as AmberRenderer, patchAmberTaskSize } from './renderer'
export { AMBER_ID } from './tokens'
