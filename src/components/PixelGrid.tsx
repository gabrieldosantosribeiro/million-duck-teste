import { useRef, useEffect, useState, useCallback } from 'react'

interface PixelGridProps {
  revealedPixels: Record<number, Set<number>>
  imageUrl: string
  selectedBlock: number | null
  onBlockClick: (blockIndex: number) => void
}

const GRID_SIZE = 10
const BLOCK_SIZE = 100
const CANVAS_SIZE = 1000

function getBlockIndex(row: number, col: number): number {
  return row * GRID_SIZE + col
}

function getBlockRowCol(blockIndex: number): [number, number] {
  return [Math.floor(blockIndex / GRID_SIZE), blockIndex % GRID_SIZE]
}

export default function PixelGrid({ revealedPixels, imageUrl, selectedBlock, onBlockClick }: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      imgRef.current = img
      setImgLoaded(true)
    }
    img.onerror = () => {
      setImgLoaded(true)
    }
  }, [imageUrl])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    const img = imgRef.current
    const hasImage = img && img.complete && img.naturalWidth > 0

    for (let blockIdx = 0; blockIdx < 100; blockIdx++) {
      const [blockRow, blockCol] = getBlockRowCol(blockIdx)
      const blockStartX = blockCol * BLOCK_SIZE
      const blockStartY = blockRow * BLOCK_SIZE
      const revealed = revealedPixels[blockIdx]

      if (!revealed || revealed.size === 0) continue

      if (hasImage) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = BLOCK_SIZE
        tempCanvas.height = BLOCK_SIZE
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) continue
        tempCtx.drawImage(img, blockStartX, blockStartY, BLOCK_SIZE, BLOCK_SIZE, 0, 0, BLOCK_SIZE, BLOCK_SIZE)
        const imageData = tempCtx.getImageData(0, 0, BLOCK_SIZE, BLOCK_SIZE)

        ctx.save()
        const revealedArray = Array.from(revealed)
        for (const pixelIdx of revealedArray) {
          const px = pixelIdx % BLOCK_SIZE
          const py = Math.floor(pixelIdx / BLOCK_SIZE)
          const dataIdx = (py * BLOCK_SIZE + px) * 4
          const r = imageData.data[dataIdx]
          const g = imageData.data[dataIdx + 1]
          const b = imageData.data[dataIdx + 2]
          const a = imageData.data[dataIdx + 3]
          ctx.fillStyle = a === 0 ? '#ffffff' : `rgb(${r},${g},${b})`
          ctx.fillRect(blockStartX + px, blockStartY + py, 1, 1)
        }
        ctx.restore()
      }
    }

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(200,200,200,0.4)'
    ctx.lineWidth = 1
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * BLOCK_SIZE
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, CANVAS_SIZE)
      ctx.moveTo(0, pos)
      ctx.lineTo(CANVAS_SIZE, pos)
    }
    ctx.stroke()

    for (let blockIdx = 0; blockIdx < 100; blockIdx++) {
      const [blockRow, blockCol] = getBlockRowCol(blockIdx)
      const x = blockCol * BLOCK_SIZE
      const y = blockRow * BLOCK_SIZE
      const revealed = revealedPixels[blockIdx]
      const isFull = revealed && revealed.size >= BLOCK_SIZE * BLOCK_SIZE

      if (!isFull) {
        if (blockIdx === hoveredBlock) {
          ctx.fillStyle = 'rgba(255,212,59,0.08)'
          ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE)
          ctx.strokeStyle = '#FFD43B'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)
        }
        if (blockIdx === selectedBlock) {
          ctx.fillStyle = 'rgba(255,212,59,0.08)'
          ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE)
          ctx.strokeStyle = '#FFD43B'
          ctx.lineWidth = 3
          ctx.strokeRect(x + 1.5, y + 1.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3)
        }
      }
    }
  }, [revealedPixels, hoveredBlock, selectedBlock])

  useEffect(() => {
    if (!imgLoaded) return
    animFrameRef.current = requestAnimationFrame(drawCanvas)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [imgLoaded, drawCanvas])

  const getCanvasCoord = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const getBlockFromCoord = (x: number, y: number): number | null => {
    if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return null
    const col = Math.floor(x / BLOCK_SIZE)
    const row = Math.floor(y / BLOCK_SIZE)
    return getBlockIndex(row, col)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coord = getCanvasCoord(e.clientX, e.clientY)
    if (!coord) return
    const block = getBlockFromCoord(coord.x, coord.y)
    setHoveredBlock(block)
  }

  const handleMouseLeave = () => {
    setHoveredBlock(null)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coord = getCanvasCoord(e.clientX, e.clientY)
    if (!coord) return
    const block = getBlockFromCoord(coord.x, coord.y)
    if (block === null) return
    const revealed = revealedPixels[block]
    if (revealed && revealed.size >= BLOCK_SIZE * BLOCK_SIZE) return
    onBlockClick(block)
  }

  const scale = containerWidth > 0 ? Math.min(containerWidth, CANVAS_SIZE) / CANVAS_SIZE : 1

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale, maxWidth: '100%', cursor: 'pointer' }}
        className="rounded-lg shadow-sm border border-gray-100"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}
