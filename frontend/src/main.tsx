import { StrictMode, useState, useCallback, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import type { Node, Edge } from 'reactflow'
import { FlowCanvas } from './components/FlowCanvas'
import { AIInputBox } from './components/AIInputBox'
import { AuthPage } from './components/AuthPage'
import { useAuthStore } from './stores/auth'
import { graphToPuml } from './lib/graphToPuml'
import { autoLayout } from './lib/layout'
import { exportPng, exportSvg, exportPdf } from './lib/export'
import './index.css'

const defaultNodes: Node[] = [
  { id: 'n1', type: 'start', position: { x: 250, y: 0 }, data: { label: '开始' } },
  { id: 'n2', type: 'io', position: { x: 250, y: 100 }, data: { label: '读取输入' } },
  { id: 'n3', type: 'decision', position: { x: 250, y: 220 }, data: { label: 'x > 0 ?' } },
  { id: 'n4', type: 'process', position: { x: 100, y: 380 }, data: { label: '执行正数逻辑' } },
  { id: 'n5', type: 'process', position: { x: 400, y: 380 }, data: { label: '执行负数逻辑' } },
  { id: 'n6', type: 'io', position: { x: 250, y: 520 }, data: { label: '输出结果' } },
  { id: 'n7', type: 'end', position: { x: 250, y: 640 }, data: { label: '结束' } },
]

const defaultEdges: Edge[] = [
  { id: 'e1', source: 'n1', sourceHandle: 'bottom', target: 'n2', targetHandle: 'top' },
  { id: 'e2', source: 'n2', sourceHandle: 'bottom-source', target: 'n3', targetHandle: 'top' },
  { id: 'e3', source: 'n3', sourceHandle: 'yes', target: 'n4', targetHandle: 'right', label: '是' },
  { id: 'e4', source: 'n3', sourceHandle: 'no', target: 'n5', targetHandle: 'left', label: '否' },
  { id: 'e5', source: 'n4', sourceHandle: 'bottom-source', target: 'n6', targetHandle: 'left' },
  { id: 'e6', source: 'n5', sourceHandle: 'bottom-source', target: 'n6', targetHandle: 'right' },
  { id: 'e7', source: 'n6', sourceHandle: 'bottom-source', target: 'n7', targetHandle: 'top' },
]

interface FlowItem {
  id: string
  title: string
  source_language: string | null
  created_at: string
  updated_at: string
}

function Editor() {
  const [nodes, setNodes] = useState<Node[]>(defaultNodes)
  const [edges, setEdges] = useState<Edge[]>(defaultEdges)
  const [pumlCode, setPumlCode] = useState('')
  const editSourceRef = useRef<'graph' | 'puml'>('graph')  // 跟踪编辑来源
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [title, setTitle] = useState('未命名流程图')
  const [showList, setShowList] = useState(false)
  const [flowList, setFlowList] = useState<FlowItem[]>([])
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState({ x: window.innerWidth - 340, y: 80 })
  const [panelSize] = useState({ w: 320, h: 300 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const { token, logout } = useAuthStore()

  const handleAIResult = useCallback((newNodes: Node[], newEdges: Edge[], puml: string) => {
    editSourceRef.current = 'puml'  // AI 结果不算画布操作
    setNodes(newNodes)
    setEdges(newEdges)
    setPumlCode(puml)
  }, [])

  const handleGraphChange = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    // 只有画布操作时才更新 PUML 代码
    if (editSourceRef.current !== 'graph') return
    const puml = graphToPuml({ nodes: currentNodes, edges: currentEdges })
    setPumlCode(puml)
  }, [])

  // PUML 代码变化时解析并更新画布
  const handlePumlChange = useCallback(async (newPuml: string) => {
    setPumlCode(newPuml)
    editSourceRef.current = 'puml'  // 标记来源为 PUML 编辑

    // 防抖：停止输入 500ms 后才解析
    clearTimeout((window as any).__pumlTimer)
    ;(window as any).__pumlTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/parse/puml', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ puml: newPuml }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.graph?.nodes) {
          const parsedNodes = data.graph.nodes.map((n: any) => ({
            id: n.id,
            type: n.type,
            position: n.position || { x: 0, y: 0 },
            data: { label: n.label },
          }))

          // 根据节点类型自动分配连接点
          const nodeTypeMap = new Map(parsedNodes.map((n: any) => [n.id, n.type]))

          const parsedEdges = (data.graph.edges || []).map((e: any) => {
            const sourceType = nodeTypeMap.get(e.source) || 'process'
            const targetType = nodeTypeMap.get(e.target) || 'process'
            // 根据源节点类型选择正确的 handle id
            let sourceHandle = sourceType === 'start' ? 'bottom' : 'bottom-source'
            let targetHandle = 'top'
            if (sourceType === 'decision') {
              // 明确判断 yes/no 分支
              if (e.type === 'yes' || e.label === '是') {
                sourceHandle = 'yes'
              } else if (e.type === 'no' || e.label === '否') {
                sourceHandle = 'no'
                // no 分支的目标节点通常在右侧，用 left 作为入口
                targetHandle = 'left'
              } else {
                // 默认：第一个分支是 yes，第二个是 no
                const decisionEdges = data.graph.edges.filter((edge: any) => edge.source === e.source)
                const index = decisionEdges.indexOf(e)
                sourceHandle = index === 0 ? 'yes' : 'no'
                if (index !== 0) targetHandle = 'left'
              }
            }
            return {
              id: e.id,
              source: e.source,
              sourceHandle,
              target: e.target,
              targetHandle,
              label: e.label,
              type: 'smartStep',
              data: { edgeType: e.type || 'default' },  // 保留原始边类型给布局用
            }
          })

          // 自动布局
          const layoutedNodes = autoLayout(parsedNodes, parsedEdges)
          setNodes(layoutedNodes)
          setEdges(parsedEdges)
        }
      } catch (e) {
        // 解析失败忽略
      }
    }, 500)
  }, [])

  // 保存
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const body = {
        title,
        graph_json: { nodes, edges },
        puml_source: pumlCode,
      }

      const url = currentId ? `/api/flow/${currentId}` : '/api/flow'
      const method = currentId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('保存失败')

      const data = await res.json()
      setCurrentId(data.id)
      alert('保存成功')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }, [nodes, edges, pumlCode, title, currentId, token])

  // 加载列表
  const loadList = useCallback(async () => {
    try {
      const res = await fetch('/api/flow?page=1&size=50', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('加载失败')
      const data = await res.json()
      setFlowList(data.items)
    } catch (e: any) {
      alert(e.message)
    }
  }, [token])

  // 加载单个项目
  const handleLoad = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/flow/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('加载失败')
      const data = await res.json()

      setCurrentId(data.id)
      setTitle(data.title)
      setNodes(data.graph_json.nodes || [])
      setEdges(data.graph_json.edges || [])
      setPumlCode(data.puml_source || '')
      setShowList(false)
    } catch (e: any) {
      alert(e.message)
    }
  }, [token])

  // 删除
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定删除？')) return
    try {
      const res = await fetch(`/api/flow/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('删除失败')
      loadList()
    } catch (e: any) {
      alert(e.message)
    }
  }, [token, loadList])

  // 导出
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    if (!canvasRef.current) return
    setExporting(true)
    try {
      const filename = `${title || 'flowchart'}.${format}`
      if (format === 'png') await exportPng(canvasRef.current, filename)
      if (format === 'svg') await exportSvg(canvasRef.current, filename)
      if (format === 'pdf') await exportPdf(canvasRef.current, filename)
    } catch (e: any) {
      alert('导出失败: ' + e.message)
    } finally {
      setExporting(false)
    }
  }, [title])

  // 新建
  const handleNew = useCallback(() => {
    setCurrentId(null)
    setTitle('未命名流程图')
    setNodes(defaultNodes)
    setEdges(defaultEdges)
    setPumlCode('')
    setShowList(false)
  }, [])

  useEffect(() => {
    if (showList) loadList()
  }, [showList, loadList])

  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return

      let newX = dragRef.current.posX + (e.clientX - dragRef.current.x)
      let newY = dragRef.current.posY + (e.clientY - dragRef.current.y)

      const maxX = window.innerWidth - panelSize.w - 20
      const maxY = window.innerHeight - panelSize.h - 60
      newX = Math.max(20, Math.min(newX, maxX))
      newY = Math.max(60, Math.min(newY, maxY))

      setPanelPos({ x: newX, y: newY })
    }

    const handleUp = () => {
      setIsDragging(false)
      dragRef.current = null
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, panelSize])

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragRef.current = { x: e.clientX, y: e.clientY, posX: panelPos.x, posY: panelPos.y }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800">AI 流程图</h1>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleNew} className="text-sm text-gray-600 hover:text-black px-2 py-1">
            新建
          </button>
          <button onClick={() => setShowList(!showList)} className="text-sm text-gray-600 hover:text-black px-2 py-1">
            打开
          </button>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="text-sm bg-black text-white px-3 py-1 rounded"
          >
            保存
          </button>
          <div className="relative group">
            <button
              disabled={exporting}
              className="text-sm text-gray-600 hover:text-black px-2 py-1 disabled:opacity-50"
            >
              {exporting ? '导出中...' : '导出 ▾'}
            </button>
            <div className="absolute right-0 top-full bg-white border rounded shadow-lg hidden group-hover:block z-50">
              <button onClick={() => handleExport('png')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                导出 PNG
              </button>
              <button onClick={() => handleExport('svg')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                导出 SVG
              </button>
              <button onClick={() => handleExport('pdf')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                导出 PDF
              </button>
            </div>
          </div>
          <button onClick={logout} className="text-sm text-gray-600 hover:text-black px-2 py-1">
            退出
          </button>
        </div>
      </header>

      {/* 项目列表弹窗 */}
      {showList && (
        <div className="absolute top-12 right-4 w-80 bg-white rounded-lg shadow-xl border z-50 max-h-96 overflow-auto">
          <div className="p-3 border-b font-medium text-sm">我的流程图</div>
          {flowList.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">暂无保存的项目</div>
          ) : (
            <div className="divide-y">
              {flowList.map((item) => (
                <div key={item.id} className="px-3 py-2 hover:bg-gray-50 flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => handleLoad(item.id)}
                  >
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(item.updated_at).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-red-400 hover:text-red-600 ml-2"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AIInputBox onResult={handleAIResult} />
      <main className="flex-1 relative">
        <div ref={canvasRef} className="w-full h-full">
          <FlowCanvas
            initialNodes={nodes}
            initialEdges={edges}
            onGraphChange={handleGraphChange}
          />
        </div>
        <div
          className="absolute bg-gray-900 rounded-lg shadow-xl border border-gray-700 flex flex-col"
          style={{
            left: `${panelPos.x}px`,
            top: `${panelPos.y}px`,
            width: `${panelSize.w}px`,
            height: `${panelSize.h}px`,
          }}
        >
          <div
            className="bg-gray-800 px-3 py-1.5 text-xs text-gray-400 cursor-move rounded-t-lg flex items-center justify-between"
            onMouseDown={handleHeaderMouseDown}
          >
            <span>PUML 源码</span>
            <span className="text-gray-600">拖动移动</span>
          </div>
          <textarea
            className="flex-1 p-3 text-green-400 font-mono text-xs bg-transparent border-none outline-none resize-none"
            value={pumlCode}
            onChange={(e) => handlePumlChange(e.target.value)}
            placeholder="PUML 源码..."
            spellCheck={false}
          />
        </div>
      </main>

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6">
            <h3 className="text-lg font-bold mb-4">保存流程图</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">文件名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">保存方式</label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    handleSave()
                  }}
                  className="flex-1 bg-black text-white py-2 rounded hover:bg-gray-800"
                >
                  保存到云端
                </button>
                {currentId && (
                  <button
                    onClick={() => {
                      setCurrentId(null)
                      setShowSaveDialog(false)
                      handleSave()
                    }}
                    className="flex-1 border border-black py-2 rounded hover:bg-gray-50"
                  >
                    另存为
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 border py-2 rounded hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function App() {
  const { token } = useAuthStore()
  const [isAuthed, setIsAuthed] = useState(!!token)

  if (!isAuthed) {
    return <AuthPage onSuccess={() => setIsAuthed(true)} />
  }

  return <Editor />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
