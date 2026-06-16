import { useState, useEffect, useCallback } from 'react'
import PixelGrid, { PIXELS_PER_BLOCK } from './components/PixelGrid'
import Modal from './components/Modal'

const TOTAL_PIXELS = 1_000_000
const GRID_SIZE = 10

export default function App() {
  const [revealedPixels, setRevealedPixels] = useState<Record<number, Set<number>>>({})
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null)

  // Count total revealed pixels
  const totalRevealed = Object.values(revealedPixels).reduce(
    (sum, set) => sum + set.size,
    0
  )

  const handlePurchase = useCallback((blockIndex: number, quantity: number) => {
    setRevealedPixels((prev) => {
      const existing = new Set(prev[blockIndex] ?? [])
      const allPixels = Array.from({ length: PIXELS_PER_BLOCK }, (_, i) => i)
      const unrevealed = allPixels.filter((i) => !existing.has(i))

      // Fisher-Yates shuffle
      for (let i = unrevealed.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[unrevealed[i], unrevealed[j]] = [unrevealed[j], unrevealed[i]]
      }

      const toReveal = unrevealed.slice(0, quantity)
      toReveal.forEach((idx) => existing.add(idx))

      return { ...prev, [blockIndex]: existing }
    })
  }, [])

  // Handle return from Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('status')
    const block = params.get('block')
    const qty = params.get('qty')

    if (status === 'success' && block !== null && qty !== null) {
      const blockIndex = parseInt(block)
      const quantity = parseInt(qty)
      if (!isNaN(blockIndex) && !isNaN(quantity) && quantity > 0) {
        handlePurchase(blockIndex, quantity)
      }
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [handlePurchase])

  const progressPercent = (totalRevealed / TOTAL_PIXELS) * 100

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Top status bar */}
      <div className="w-full border-b border-gray-100 py-3">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl" role="img" aria-label="pato">🦆</span>
            <span className="font-bold text-[#1F1F1F] text-sm tracking-tight">MILLION DUCK</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 sm:w-40 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFD43B] rounded-full transition-all duration-700"
                style={{ width: `${Math.max(progressPercent, 0.3)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
              {totalRevealed.toLocaleString('pt-BR')}/{TOTAL_PIXELS.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="max-w-2xl mx-auto px-4 pt-10 pb-8 text-center w-full">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF4B8] text-[#9A6B00] text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD43B] animate-pulse" />
          {totalRevealed.toLocaleString('pt-BR')} de 1.000.000 pixels revelados
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1F1F1F] tracking-tight leading-none mb-4">
          MILLION<br />
          <span className="text-[#FFD43B]">DUCK</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-500 max-w-sm mx-auto leading-relaxed">
          Compre pixels. Ajude a revelar a imagem secreta.
        </p>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#FFD43B]" />
            <span>R$ 1,00 por pixel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-gray-200" />
            <span>Grade {GRID_SIZE}×{GRID_SIZE}</span>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="flex-1 max-w-2xl mx-auto px-4 w-full pb-8">
        <div className="relative">
          <PixelGrid
            revealedPixels={revealedPixels}
            onBlockClick={(blockIndex) => setSelectedBlock(blockIndex)}
          />

          {/* Instruction overlay — shown only when nothing revealed */}
          {totalRevealed === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl px-5 py-3 shadow-sm text-center">
                <p className="text-sm font-medium text-[#1F1F1F]">Clique em um bloco para revelar</p>
                <p className="text-xs text-gray-400 mt-0.5">100 × 100 pixels por bloco</p>
              </div>
            </div>
          )}
        </div>

        {/* Block info legend */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-gray-50">
            <div className="text-lg font-bold text-[#1F1F1F]">100</div>
            <div className="text-xs text-gray-500 mt-0.5">blocos</div>
          </div>
          <div className="p-3 rounded-xl bg-[#FFF4B8]">
            <div className="text-lg font-bold text-[#1F1F1F]">10.000</div>
            <div className="text-xs text-gray-500 mt-0.5">pixels/bloco</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50">
            <div className="text-lg font-bold text-[#1F1F1F]">R$ 1</div>
            <div className="text-xs text-gray-500 mt-0.5">por pixel</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>🦆 Million Duck — A imagem secreta</span>
          <span>Pagamento seguro via Mercado Pago</span>
        </div>
      </footer>

      {/* Modal */}
      {selectedBlock !== null && (
        <Modal
          blockIndex={selectedBlock}
          revealedPixels={revealedPixels}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </div>
  )
}
