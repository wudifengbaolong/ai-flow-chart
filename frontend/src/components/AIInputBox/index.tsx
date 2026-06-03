import { useState, useCallback } from 'react'
import type { Node, Edge } from 'reactflow'
import { autoLayout } from '../../lib/layout'

interface AIInputBoxProps {
  onResult: (nodes: Node[], edges: Edge[], puml: string) => void
}

export function AIInputBox({ onResult }: AIInputBoxProps) {
  const [code, setCode] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('deepseek')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = useCallback(async () => {
    console.log('点击了生成按钮', { code: code.substring(0, 20), apiKey: apiKey.substring(0, 10) + '...', provider })

    if (!code.trim() || !apiKey.trim()) {
      setError('请输入代码和 API Key')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('发送请求...')
      const res = await fetch('/api/ai/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: 'c',
          provider,
          api_key: apiKey,
        }),
      })

      console.log('响应状态:', res.status)
      if (!res.ok) {
        const err = await res.json()
        console.log('错误响应:', err)
        throw new Error(err.detail?.message || 'AI 转换失败')
      }

      const data = await res.json()
      console.log('成功响应:', data)

      // 转换 Graph JSON 为 ReactFlow 格式
      const nodes: Node[] = (data.graph.nodes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        position: n.position || { x: 0, y: 0 },
        data: { label: n.label },
      }))

      // 根据节点类型自动分配连接点
      const nodeMap = new Map(nodes.map(n => [n.id, n.type]))

      const edges: Edge[] = (data.graph.edges || []).map((e: any) => {
        const sourceType = nodeMap.get(e.source) || 'process'

        // 根据源节点类型选择正确的 handle id
        let sourceHandle = sourceType === 'start' ? 'bottom' : 'bottom-source'
        if (sourceType === 'decision') {
          if (e.type === 'yes' || e.label === '是') {
            sourceHandle = 'yes'
          } else if (e.type === 'no' || e.label === '否') {
            sourceHandle = 'no'
          } else {
            // 默认：第一个分支是 yes，第二个是 no
            const decisionEdges = data.graph.edges.filter((edge: any) => edge.source === e.source)
            const index = decisionEdges.indexOf(e)
            sourceHandle = index === 0 ? 'yes' : 'no'
          }
        }

        return {
          id: e.id,
          source: e.source,
          sourceHandle,
          target: e.target,
          targetHandle: 'top',
          label: e.label,
          type: 'smartStep',
        }
      })

      // 自动布局
      const layoutedNodes = autoLayout(nodes, edges)
      onResult(layoutedNodes, edges, data.puml)
    } catch (e: any) {
      setError(e.message || '转换失败')
    } finally {
      setLoading(false)
    }
  }, [code, apiKey, provider, onResult])

  return (
    <div className="bg-white border-b p-4 flex flex-col gap-3">
      <div className="flex gap-3 items-center">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm"
        >
          <option value="deepseek">DeepSeek</option>
          <option value="openai">OpenAI</option>
          <option value="claude">Claude</option>
        </select>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="API Key"
          className="border rounded px-3 py-1.5 text-sm flex-1 max-w-[300px]"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-black text-white px-4 py-1.5 rounded text-sm disabled:opacity-50"
        >
          {loading ? '转换中...' : '生成流程图'}
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="粘贴代码..."
        rows={4}
        className="border rounded px-3 py-2 text-sm font-mono resize-none"
      />
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}
    </div>
  )
}
