import { useState, useEffect, useCallback } from 'react'
import PixelGrid from './components/PixelGrid'
import Modal from './components/Modal'

const TOTAL_PIXELS = 1_000_000
const PIXELS_PER_BLOCK = 10_000

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function App() {
  const [revealedPixels, setRevealedPixels] = useState<Record<number, Set<number>>>(() => {
    const stored = localStorage.getItem('million-duck-revealed')
    if (stored) {
      try {
        const parsed: Record<string, number[]> = JSON.parse(stored)
        const reconstructed: Record<number, Set<number>> = {}
        for (const [key, arr] of Object.entries(parsed)) {
          reconstructed[Number(key)] = new Set(arr)
        }
        return reconstructed
      } catch { /* ignore */ }
    }
    return {}
  })

  const [selectedBlock, setSelectedBlock] = useState<number | null>(null)
  const imageUrl = '/pato.png'

  useEffect(() => {
    const data: Record<string, number[]> = {}
    for (const [key, set] of Object.entries(revealedPixels)) {
      data[key] = Array.from(set)
    }
    localStorage.setItem('million-duck-revealed', JSON.stringify(data))
  }, [revealedPixels])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    const blockStr = params.get('block')
    const qtyStr = params.get('qty')

    if (status === 'success' && blockStr !== null && qtyStr !== null) {
      const block = parseInt(blockStr, 10)
      const qty = parseInt(qtyStr, 10)
      if (!isNaN(block) && !isNaN(qty) && qty > 0) {
        handlePurchase(block, qty)
      }
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handlePurchase = useCallback((blockIndex: number, quantidade: number) => {
    setRevealedPixels(prev => {
      const existing = prev[blockIndex] ?? new Set<number>()
      const allIndices = Array.from({ length: PIXELS_PER_BLOCK }, (_, i) => i)
      const available = allIndices.filter(i => !existing.has(i))
      const toReveal = shuffleArray(available).slice(0, Math.min(quantidade, available.length))
      const updated = new Set(existing)
      for (const idx of toReveal) {
        updated.add(idx)
      }
      return { ...prev, [blockIndex]: updated }
    })
  }, [])

  const totalRevealed = Object.values(revealedPixels).reduce((acc, set) => acc + set.size, 0)

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-[1000px] flex flex-col items-center gap-6 sm:gap-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-sm font-medium text-text/70">
          <span className="w-2 h-2 rounded-full bg-primary" />
          {totalRevealed.toLocaleString('pt-BR')} de {TOTAL_PIXELS.toLocaleString('pt-BR')} pixels revelados
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-text leading-none">
            MILLION DUCK
          </h1>
          <p className="text-base sm:text-lg text-text/60 font-medium">
            Compre pixels. Ajude a revelar a imagem secreta.
          </p>
        </div>

        <PixelGrid
          revealedPixels={revealedPixels}
          imageUrl={imageUrl}
          selectedBlock={selectedBlock}
          onBlockClick={setSelectedBlock}
        />

        <footer className="w-full border-t border-gray-100 pt-6 pb-2 text-center text-sm text-text/40">
          <p>Million Duck &copy; {new Date().getFullYear()} &mdash; Cada pixel R$ 1,00</p>
        </footer>
      </div>

      {selectedBlock !== null && (
        <Modal
          blockIndex={selectedBlock}
          availablePixels={PIXELS_PER_BLOCK - (revealedPixels[selectedBlock]?.size ?? 0)}
          onClose={() => setSelectedBlock(null)}
          onPurchase={handlePurchase}
        />
      )}
    </div>
  )
}

export default App
