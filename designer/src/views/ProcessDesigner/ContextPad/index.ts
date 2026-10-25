import type { ModuleDeclaration } from 'didi'
import CustomContextPadProvider from '@/views/ProcessDesigner/ContextPad/CustomContextPadProvider.ts'
import ContextPadPlacement from '@/views/ProcessDesigner/ContextPad/contextPadPlacement.ts'

const customContextPad: ModuleDeclaration = {
  __init__: ['customContextPadProvider', 'contextPadPlacement'],
  customContextPadProvider: ['type', CustomContextPadProvider],
  contextPadPlacement: ['type', ContextPadPlacement],
}

export default customContextPad
