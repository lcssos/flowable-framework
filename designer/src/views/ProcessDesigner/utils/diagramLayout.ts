import { layoutProcess } from 'bpmn-auto-layout'

const BPMN_NS = 'http://www.omg.org/spec/BPMN/20100524/MODEL'

function hasFlowRef(element: Element, tag: string, flowId: string) {
  return [...element.children].some(
    (child) => child.localName === tag && child.textContent?.trim() === flowId,
  )
}

function appendFlowRef(doc: XMLDocument, element: Element, tag: string, flowId: string) {
  const ref = doc.createElementNS(BPMN_NS, tag)
  ref.textContent = flowId
  element.appendChild(ref)
}

// bpmn-auto-layout 只沿着 flowNode.outgoing 布局。
// 引擎部署的 XML 通常只在 sequenceFlow 上写 sourceRef/targetRef。
function linkSequenceFlows(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) {
    return xml
  }
  const byId = new Map<string, Element>()
  for (const element of doc.getElementsByTagNameNS(BPMN_NS, '*')) {
    const id = element.getAttribute('id')
    if (id) {
      byId.set(id, element)
    }
  }
  for (const flow of doc.getElementsByTagNameNS(BPMN_NS, 'sequenceFlow')) {
    const flowId = flow.getAttribute('id')
    const source = byId.get(flow.getAttribute('sourceRef') ?? '')
    const target = byId.get(flow.getAttribute('targetRef') ?? '')
    if (!flowId || !source || !target) {
      continue
    }
    if (!hasFlowRef(source, 'outgoing', flowId)) {
      appendFlowRef(doc, source, 'outgoing', flowId)
    }
    if (!hasFlowRef(target, 'incoming', flowId)) {
      appendFlowRef(doc, target, 'incoming', flowId)
    }
  }
  return new XMLSerializer().serializeToString(doc)
}

export async function xmlWithDiagram(xml: string) {
  if (xml.includes('BPMNDiagram')) {
    return xml
  }
  return layoutProcess(linkSequenceFlows(xml))
}
