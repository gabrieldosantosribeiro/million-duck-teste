import React, { useRef, useEffect, useState, useCallback } from 'react'

const GRID_COLS = 10
const GRID_ROWS = 10
const CANVAS_SIZE = 1000
const BLOCK_SIZE = CANVAS_SIZE / GRID_COLS // 100px per block
const PIXELS_PER_BLOCK = BLOCK_SIZE * BLOCK_SIZE // 10.000 pixels

interface PixelGridProps {
  revealedPixels: Record<number, Set<number>>
  onBlockClick: (blockIndex: number) => void
}

export default function PixelGrid({ revealedPixels, onBlockClick }: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null)
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null)

  // Load the secret image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = '/pato.png'
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
    }
    img.onerror = () => {
      // Image not found — create a placeholder colored image
      const offscreen = document.createElement('canvas')
      offscreen.width = CANVAS_SIZE
      offscreen.height = CANVAS_SIZE
      const ctx = offscreen.getContext('2d')!
      // Gradient placeholder
      const grad = ctx.createRadialGradient(500, 500, 50, 500, 500, 600)
      grad.addColorStop(0, '#FFD43B')
      grad.addColorStop(0.5, '#FF8C00')
      grad.addColorStop(1, '#FF4500')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      // Draw duck silhouette hint
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.ellipse(500, 550, 280, 220, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(620, 340, 130, 110, -0.3, 0, Math.PI * 2)
      ctx.fill()

      const fakeImg = new Image()
      fakeImg.src = offscreen.toDataURL()
      fakeImg.onload = () => {
        imageRef.current = fakeImg
        setImageLoaded(true)
      }
    }
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageLoaded) return
    const ctx = canvas.getContext('2d')!
    const img = imageRef.current

    // White base
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Draw revealed pixels from the secret image
    if (img && Object.keys(revealedPixels).length > 0) {
      // Draw image offscreen to sample colors
      const offscreen = document.createElement('canvas')
      offscreen.width = CANVAS_SIZE
      offscreen.height = CANVAS_SIZE
      const offCtx = offscreen.getContext('2d')!
      offCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
      const imageData = offCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      for (const [blockIdxStr, pixelSet] of Object.entries(revealedPixels)) {
        const blockIdx = parseInt(blockIdxStr)
        const blockRow = Math.floor(blockIdx / GRID_COLS)
        const blockCol = blockIdx % GRID_COLS
        const blockStartX = blockCol * BLOCK_SIZE
        const blockStartY = blockRow * BLOCK_SIZE

        for (const localPixelIdx of pixelSet) {
          const localRow = Math.floor(localPixelIdx / BLOCK_SIZE)
          const localCol = localPixelIdx % BLOCK_SIZE
          const globalX = blockStartX + localCol
          const globalY = blockStartY + localRow

          const dataIdx = (globalY * CANVAS_SIZE + globalX) * 4
          const r = imageData.data[dataIdx]
          const g = imageData.data[dataIdx + 1]
          const b = imageData.data[dataIdx + 2]

          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.fillRect(globalX, globalY, 1, 1)
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(200,200,200,0.4)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= GRID_COLS; i++) {
      ctx.beginPath()
      ctx.moveTo(i * BLOCK_SIZE, 0)
      ctx.lineTo(i * BLOCK_SIZE, CANVAS_SIZE)
      ctx.stroke()
    }
    for (let j = 0; j <= GRID_ROWS; j++) {
      ctx.beginPath()
      ctx.moveTo(0, j * BLOCK_SIZE)
      ctx.lineTo(CANVAS_SIZE, j * BLOCK_SIZE)
      ctx.stroke()
    }

    // Hover highlight
    if (hoveredBlock !== null) {
      const row = Math.floor(hoveredBlock / GRID_COLS)
      const col = hoveredBlock % GRID_COLS
      ctx.strokeStyle = 'rgba(255,212,59,0.6)'
      ctx.lineWidth = 2
      ctx.strokeRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)
      ctx.fillStyle = 'rgba(255,212,59,0.05)'
      ctx.fillRect(col * BLOCK_SIZE + 1, row * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2)
    }

    // Selected highlight
    if (selectedBlock !== null) {
      const row = Math.floor(selectedBlock / GRID_COLS)
      const col = selectedBlock % GRID_COLS
      ctx.strokeStyle = '#FFD43B'
      ctx.lineWidth = 3
      ctx.strokeRect(col * BLOCK_SIZE + 1.5, row * BLOCK_SIZE + 1.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3)
      ctx.fillStyle = 'rgba(255,212,59,0.08)'
      ctx.fillRect(col * BLOCK_SIZE + 1.5, row * BLOCK_SIZE + 1.5, BLOCK_SIZE - 3, BLOCK_SIZE - 3)
    }
  }, [imageLoaded, revealedPixels, hoveredBlock, selectedBlock])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const getBlockFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const col = Math.floor(x / BLOCK_SIZE)
    const row = Math.floor(y / BLOCK_SIZE)
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null
    return row * GRID_COLS + col
  }

  const isBlockFull = (blockIdx: number) => {
    const revealed = revealedPixels[blockIdx]
    return revealed && revealed.size >= PIXELS_PER_BLOCK
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const block = getBlockFromEvent(e)
    setHoveredBlock(block)
  }

  const handleMouseLeave = () => {
    setHoveredBlock(null)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const block = getBlockFromEvent(e)
    if (block === null) return
    if (isBlockFull(block)) return
    setSelectedBlock(block)
    onBlockClick(block)
  }

  const getCursorStyle = () => {
    if (hoveredBlock === null) return 'default'
    if (isBlockFull(hoveredBlock)) return 'not-allowed'
    return 'pointer'
  }

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-full h-auto rounded-lg shadow-lg border border-gray-100 canvas-container"
        style={{ cursor: getCursorStyle() }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400 text-sm">Carregando...</div>
        </div>
      )}
    </div>
  )
}

export { PIXELS_PER_BLOCK }
