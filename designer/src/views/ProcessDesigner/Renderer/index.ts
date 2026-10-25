import VariableEventRenderer from './RewriteRenderer/VariableEventRenderer.ts'
import ConnectorIconRenderer from './RewriteRenderer/ConnectorIconRenderer'
import ExclusiveGatewayRender from '@/views/ProcessDesigner/Renderer/RewriteRenderer/ExclusiveGatewayRender.ts'
import InkRenderer, { patchInkTaskSize } from './RewriteRenderer/InkRenderer'
import { AmberRenderer, patchAmberTaskSize } from '@/theme/amber'

const httpTaskRenderer = {
  __init__: [
    'variableEventRenderer',
    'connectorIconRenderer',
    'neutralElementColors',
    'exclusiveGatewayRender',
    'inkRenderer',
    'inkTaskSize',
    'amberRenderer',
    'amberTaskSize',
  ],
  variableEventRenderer: ['type', VariableEventRenderer],
  neutralElementColors: ['type', class {}],
  connectorIconRenderer: ['type', ConnectorIconRenderer],
  exclusiveGatewayRender: ['type', ExclusiveGatewayRender],
  inkRenderer: ['type', InkRenderer],
  inkTaskSize: ['type', patchInkTaskSize],
  amberRenderer: ['type', AmberRenderer],
  amberTaskSize: ['type', patchAmberTaskSize],
}

export default httpTaskRenderer
