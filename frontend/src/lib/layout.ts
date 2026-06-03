import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'

const NODE_H = 56
const DECISION_SIZE = 100

function getW(node: Node): number {
  if (node.type === 'decision') return DECISION_SIZE
  if (node.type === 'start' || node.type === 'end') return 120
  const label = (node.data as any)?.label || ''
  return Math.max(150, Math.min(280, label.length * 14 + 40))
}

export function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // 建立边类型映射
  const edgeTypeMap = new Map<string, string>()
  for (const edge of edges) {
    const edgeType = (edge as any).data?.edgeType || edge.type || 'default'
    edgeTypeMap.set(`${edge.source}->${edge.target}`, edgeType)
  }

  // dagre 基础布局
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 160, marginx: 60, marginy: 60 })

  for (const node of nodes) {
    g.setNode(node.id, { width: getW(node), height: NODE_H })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }
  dagre.layout(g)

  // dagre 布局后，调整 decision 节点的分支位置
  // yes 分支：放在 decision 正下方
  // no 分支：放在 decision 右侧
  const positions = new Map<string, { x: number; y: number }>()

  for (const node of nodes) {
    const pos = g.node(node.id)
    positions.set(node.id, { x: pos.x, y: pos.y })
  }

  // 对每个 decision 节点，调整 yes/no 分支位置
  for (const node of nodes) {
    if (node.type !== 'decision') continue

    const decisionPos = positions.get(node.id)!
    const yesNodes: string[] = []
    const noNodes: string[] = []

    for (const edge of edges) {
      if (edge.source !== node.id) continue
      const key = `${edge.source}->${edge.target}`
      const t = edgeTypeMap.get(key)
      if (t === 'yes') yesNodes.push(edge.target)
      else if (t === 'no') noNodes.push(edge.target)
    }

    // yes 分支：放在 decision 正下方
    let yesY = decisionPos.y + 160
    for (const yesId of yesNodes) {
      const w = getW(nodeMap.get(yesId)!)
      positions.set(yesId, { x: decisionPos.x, y: yesY })
      yesY += 100
    }

    // no 分支：放在 decision 右侧
    let noY = decisionPos.y
    for (const noId of noNodes) {
      const w = getW(nodeMap.get(noId)!)
      positions.set(noId, { x: decisionPos.x + 350, y: noY })
      noY += 100
    }
  }

  return nodes.map(node => {
    const pos = positions.get(node.id)!
    const w = getW(node)
    return {
      ...node,
      position: { x: pos.x - w / 2, y: pos.y - NODE_H / 2 },
    }
  })
}
