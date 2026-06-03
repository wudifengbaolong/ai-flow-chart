import { useCallback, useMemo, useEffect } from 'react'
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'

// 黑色箭头连线样式
const defaultEdgeOptions = {
  type: 'smartStep',
  style: { stroke: '#000', strokeWidth: 2 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#000',
    width: 8,
    height: 8,
  },
}

interface FlowCanvasProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onGraphChange?: (nodes: Node[], edges: Edge[]) => void
}

export function FlowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onGraphChange,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'smartStep' }, eds))
    },
    [setEdges],
  )

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => els.map((el) => {
        if (el.id === oldEdge.id) {
          return { ...el, ...newConnection }
        }
        return el
      }))
    },
    [setEdges],
  )

  const memoizedNodeTypes = useMemo(() => nodeTypes, [])
  const memoizedEdgeTypes = useMemo(() => edgeTypes, [])

  // 当外部数据变化时，更新内部状态
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  // 通知父组件画布数据变化
  useEffect(() => {
    onGraphChange?.(nodes, edges)
  }, [nodes, edges, onGraphChange])

  return (
    <div className="w-full h-full">
      {/* 定义两种箭头：黑色（默认）和蓝色（选中） */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrow-black"
            markerWidth="8"
            markerHeight="8"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#000" />
          </marker>
          <marker
            id="arrow-blue"
            markerWidth="8"
            markerHeight="8"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path d="M 0 0 L 8 4 L 0 8 Z" fill="#2563eb" />
          </marker>
        </defs>
      </svg>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode="Delete"
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#ccc" />
      </ReactFlow>
    </div>
  )
}
