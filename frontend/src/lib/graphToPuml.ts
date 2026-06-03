interface Node {
  id: string
  type: string
  label: string
  position?: { x: number; y: number }
}

interface Edge {
  id: string
  source: string
  target: string
  label?: string
  type?: string
}

interface FlowGraph {
  nodes: Node[]
  edges: Edge[]
}

function escapePuml(text: string | undefined): string {
  if (!text) return ''
  return text.replace(/;/g, '\\;').replace(/\n/g, ' ')
}

function getNodeLabel(node: Node): string {
  // 兼容 node.label 和 node.data.label
  return (node as any).data?.label || node.label || ''
}

// 拓扑排序：按依赖关系排列节点
function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  const nodeMap = new Map<string, Node>()
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const sorted: Node[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    sorted.push(nodeMap.get(id)!)
    for (const neighbor of adjacency.get(id) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  // 如果有环或未排序的节点，追加到末尾
  for (const node of nodes) {
    if (!sorted.find(n => n.id === node.id)) {
      sorted.push(node)
    }
  }

  return sorted
}

// 找出决策节点的分支
function findDecisionBranches(nodeId: string, edges: Edge[]): { yes?: string; no?: string; default?: string } {
  const branches: { yes?: string; no?: string; default?: string } = {}
  for (const edge of edges) {
    if (edge.source === nodeId) {
      if (edge.type === 'yes' || edge.label === '是' || edge.label === 'yes') {
        branches.yes = edge.target
      } else if (edge.type === 'no' || edge.label === '否' || edge.label === 'no') {
        branches.no = edge.target
      } else {
        branches.default = edge.target
      }
    }
  }
  return branches
}

// 找出循环节点
function findLoopBody(loopId: string, edges: Edge[]): string | undefined {
  for (const edge of edges) {
    if (edge.source === loopId && edge.label !== '循环') {
      return edge.target
    }
  }
  return undefined
}

export function graphToPuml(graph: FlowGraph): string {
  const lines: string[] = ['@startuml', '']

  const { nodes, edges } = graph
  const nodeMap = new Map<string, Node>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  // 记录已处理的节点
  const processed = new Set<string>()

  // 递归生成节点的 PUML
  function emitNode(nodeId: string, indent: string = '') {
    if (processed.has(nodeId)) return
    processed.add(nodeId)

    const node = nodeMap.get(nodeId)
    if (!node) return

    switch (node.type) {
      case 'start':
        lines.push(`${indent}start`)
        break
      case 'end':
        lines.push(`${indent}stop`)
        break
      case 'process':
      case 'function_call':
      case 'io':
        lines.push(`${indent}:${escapePuml(getNodeLabel(node))};`)
        break
      case 'decision': {
        const branches = findDecisionBranches(nodeId, edges)
        lines.push(`${indent}if (${escapePuml(getNodeLabel(node))}) then (yes)`)
        if (branches.yes) {
          emitNode(branches.yes, indent + '  ')
        }
        lines.push(`${indent}else (no)`)
        if (branches.no) {
          emitNode(branches.no, indent + '  ')
        }
        lines.push(`${indent}endif`)
        break
      }
      case 'loop': {
        lines.push(`${indent}while (${escapePuml(getNodeLabel(node))})`)
        const body = findLoopBody(nodeId, edges)
        if (body) {
          emitNode(body, indent + '  ')
        }
        lines.push(`${indent}endwhile`)
        break
      }
      default:
        lines.push(`${indent}:${escapePuml(getNodeLabel(node))};`)
    }

    // 处理后续节点（非决策/循环的分支）
    if (node.type !== 'decision' && node.type !== 'loop') {
      for (const edge of edges) {
        if (edge.source === nodeId) {
          emitNode(edge.target, indent)
        }
      }
    }
  }

  // 从 start 节点开始
  const startNode = nodes.find(n => n.type === 'start')
  if (startNode) {
    emitNode(startNode.id)
  } else {
    // 没有 start 节点，按拓扑排序
    const sorted = topologicalSort(nodes, edges)
    for (const node of sorted) {
      if (!processed.has(node.id)) {
        emitNode(node.id)
      }
    }
  }

  lines.push('')
  lines.push('@enduml')
  return lines.join('\n')
}
