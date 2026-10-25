import CustomBpmnFactory from './CustomBpmnFactory.ts'
import KeepPassingFlowBehavior from './KeepPassingFlowBehavior.ts'

const customModeling = {
  __init__: ['bpmnFactory', 'keepPassingFlowBehavior'],
  bpmnFactory: ['type', CustomBpmnFactory],
  keepPassingFlowBehavior: ['type', KeepPassingFlowBehavior],
}

export default customModeling
