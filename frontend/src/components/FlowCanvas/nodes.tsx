import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'

// Style spec: 黑白配色，白底黑线，简洁清晰
// 所有节点提供上下左右四个连接点，支持手动调整连线位置
// 连接点默认隐藏，鼠标悬停节点时显示

const handleClass = '!w-0 !h-0 !bg-black !border-0 opacity-0 group-hover:!w-2 group-hover:!h-2 group-hover:opacity-100 transition-all duration-150'

function StartNode({ data }: NodeProps) {
  return (
    <div className="group bg-white border-2 border-black px-8 py-3 text-sm font-medium"
      style={{ borderRadius: '9999px' }}>
      <div className="text-black text-center">{data.label}</div>
      <Handle type="source" position={Position.Top} id="top" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="source" position={Position.Left} id="left" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right" className={handleClass} />
    </div>
  )
}

function EndNode({ data }: NodeProps) {
  return (
    <div className="group bg-white border-2 border-black px-8 py-3 text-sm font-medium"
      style={{ borderRadius: '9999px' }}>
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass} />
      <Handle type="target" position={Position.Right} id="right" className={handleClass} />
      <div className="text-black text-center">{data.label}</div>
    </div>
  )
}

function ProcessNode({ data }: NodeProps) {
  return (
    <div className="group bg-white border-2 border-black px-6 py-3 text-sm font-medium">
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass} />
      <Handle type="target" position={Position.Right} id="right" className={handleClass} />
      <div className="text-black text-center">{data.label}</div>
      <Handle type="source" position={Position.Top} id="top-source" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClass} />
      <Handle type="source" position={Position.Left} id="left-source" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right-source" className={handleClass} />
    </div>
  )
}

function DecisionNode({ data }: NodeProps) {
  return (
    <div className="group relative flex items-center justify-center"
      style={{ width: '120px', height: '120px' }}>
      <div className="absolute bg-white border-2 border-black"
        style={{
          width: '80px',
          height: '80px',
          transform: 'rotate(45deg)',
        }} />
      <div className="relative z-10 text-black text-xs text-center px-2 max-w-[70px] leading-tight">
        {data.label}
      </div>
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="yes" className={handleClass} />
      <Handle type="source" position={Position.Right} id="no" className={handleClass} />
    </div>
  )
}

function LoopNode({ data }: NodeProps) {
  return (
    <div className="group bg-white border-2 border-black px-6 py-3 text-sm font-medium">
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass} />
      <Handle type="target" position={Position.Right} id="right" className={handleClass} />
      <div className="text-black text-center">{data.label}</div>
      <Handle type="source" position={Position.Top} id="top-source" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClass} />
      <Handle type="source" position={Position.Left} id="left-source" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right-source" className={handleClass} />
    </div>
  )
}

function FunctionCallNode({ data }: NodeProps) {
  return (
    <div className="group bg-white border-2 border-black px-6 py-3 text-sm font-medium">
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass} />
      <Handle type="target" position={Position.Right} id="right" className={handleClass} />
      <div className="text-black text-center">{data.label}</div>
      <Handle type="source" position={Position.Top} id="top-source" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClass} />
      <Handle type="source" position={Position.Left} id="left-source" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right-source" className={handleClass} />
    </div>
  )
}

function IONode({ data }: NodeProps) {
  return (
    <div className="group bg-white border-2 border-black px-6 py-3 text-sm font-medium">
      <Handle type="target" position={Position.Top} id="top" className={handleClass} />
      <Handle type="target" position={Position.Bottom} id="bottom" className={handleClass} />
      <Handle type="target" position={Position.Left} id="left" className={handleClass} />
      <Handle type="target" position={Position.Right} id="right" className={handleClass} />
      <div className="text-black text-center">{data.label}</div>
      <Handle type="source" position={Position.Top} id="top-source" className={handleClass} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className={handleClass} />
      <Handle type="source" position={Position.Left} id="left-source" className={handleClass} />
      <Handle type="source" position={Position.Right} id="right-source" className={handleClass} />
    </div>
  )
}

export const nodeTypes = {
  start: memo(StartNode),
  end: memo(EndNode),
  process: memo(ProcessNode),
  decision: memo(DecisionNode),
  loop: memo(LoopNode),
  function_call: memo(FunctionCallNode),
  io: memo(IONode),
}
