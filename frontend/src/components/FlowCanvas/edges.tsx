import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { getSmoothStepPath, type EdgeProps } from 'reactflow'

function SmartStepEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, selected, label: edgeLabel, data } = props
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState((edgeLabel as string) || data?.label || '')
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; startPos: { x: number; y: number } } | null>(null)

  const dx = Math.abs(sourceX - targetX)
  const dy = Math.abs(sourceY - targetY)
  const edgeLen = Math.sqrt(dx * dx + dy * dy)

  // 判断是否对齐（差距小于5px视为对齐）
  const isAligned = dx < 5 || dy < 5

  // 判断是否是水平直连（源在右，目标在左，且 Y 接近）
  const isHorizontal = Math.abs(sourceY - targetY) < 20 && targetX > sourceX

  let path: string

  if (isAligned) {
    // 完全对齐：直线
    path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`
  } else if (isHorizontal && sourcePosition === 'right' && targetPosition === 'left') {
    // 水平直连：源右 → 目标左，走 L 形路径
    const midX = (sourceX + targetX) / 2
    path = `M ${sourceX},${sourceY} L ${midX},${sourceY} L ${midX},${targetY} L ${targetX},${targetY}`
  } else {
    // 其他情况：smartStep
    const [smoothPath] = getSmoothStepPath({
      ...props,
      borderRadius: 0,
    })
    path = smoothPath
  }

  const edgeStyle = selected
    ? { ...style, stroke: '#2563eb', strokeWidth: 3 }
    : style

  const markerUrl = selected ? 'url(#arrow-blue)' : 'url(#arrow-black)'

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
  }, [])

  const handleSave = useCallback(() => {
    setEditing(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setEditing(false)
      setText(data?.label || '')
    }
  }, [handleSave, data?.label])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPos: { x: textPos?.x ?? midX, y: textPos?.y ?? midY },
    }
  }, [midX, midY, textPos])

  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return

      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      setTextPos({
        x: dragStartRef.current.startPos.x + deltaX,
        y: dragStartRef.current.startPos.y + deltaY,
      })
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging])

  const finalTextX = textPos ? textPos.x : midX
  const finalTextY = textPos ? textPos.y : midY

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      <path
        style={{ stroke: 'transparent', strokeWidth: 20, fill: 'none' }}
        d={path}
      />
      <path
        style={edgeStyle}
        className="react-flow__edge-path"
        d={path}
        markerEnd={markerUrl}
      />
      {text && !editing && (
        <g style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
          <text
            x={finalTextX}
            y={finalTextY + 4}
            textAnchor="middle"
            fontSize={12}
            fill={selected ? '#2563eb' : '#000'}
            style={{ userSelect: 'none' }}
            onMouseDown={handleMouseDown}
          >
            {text}
          </text>
        </g>
      )}
      {editing && (
        <foreignObject
          x={finalTextX - 50}
          y={finalTextY - 12}
          width={100}
          height={24}
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              height: '100%',
              border: '1px solid #2563eb',
              borderRadius: '3px',
              textAlign: 'center',
              fontSize: '12px',
              outline: 'none',
              padding: '0 4px',
              boxSizing: 'border-box',
            }}
          />
        </foreignObject>
      )}
      {hovered && !isDragging && (
        <>
          <circle
            cx={sourceX}
            cy={sourceY}
            r={6}
            fill="white"
            stroke="#2563eb"
            strokeWidth={2}
            className="react-flow__edgeupdater"
            data-edgeupdaterid="source"
            style={{ cursor: 'grab' }}
          />
          <circle
            cx={targetX}
            cy={targetY}
            r={6}
            fill="white"
            stroke="#2563eb"
            strokeWidth={2}
            className="react-flow__edgeupdater"
            data-edgeupdaterid="target"
            style={{ cursor: 'grab' }}
          />
        </>
      )}
    </g>
  )
}

export const edgeTypes = {
  smartStep: memo(SmartStepEdge),
}
