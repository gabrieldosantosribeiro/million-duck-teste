import React, { useState, useEffect } from 'react'

const GRID_COLS = 10
const PIXELS_PER_BLOCK = 10000

interface ModalProps {
  blockIndex: number
  revealedPixels: Record<number, Set<number>>
  onClose: () => void
}

type ModalState = 'form' | 'loading' | 'error'

export default function Modal({ blockIndex, revealedPixels, onClose }: ModalProps) {
  const [state, setState] = useState<ModalState>('form')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [quantidade, setQuantidade] = useState(100)
  const [errorMsg, setErrorMsg] = useState('')

  const row = Math.floor(blockIndex / GRID_COLS) + 1
  const col = (blockIndex % GRID_COLS) + 1
  const revealed = revealedPixels[blockIndex]?.size ?? 0
  const available = PIXELS_PER_BLOCK - revealed
  const total = quantidade * 1

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || quantidade < 1) return

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/criar-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, quantidade, blockIndex }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erro ${res.status}`)
      }

      const data = await res.json()
      if (!data.checkoutUrl) throw new Error('URL de pagamento não recebida.')

      window.location.href = data.checkoutUrl
    } catch (err: unknown) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro desconhecido. Tente novamente.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF4B8] text-[#9A6B00] text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD43B]" />
            Bloco {row} × {col}
          </div>
          <h2 className="text-xl font-bold text-[#1F1F1F] tracking-tight">
            Comprar pixels
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {available.toLocaleString('pt-BR')} pixels disponíveis neste bloco · R$ 1,00 cada
          </p>
        </div>

        {state === 'error' && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            {errorMsg}
            <button
              onClick={() => setState('form')}
              className="block mt-1 text-xs underline text-red-500"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {state === 'loading' ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#FFD43B] border-t-transparent animate-spin" />
            <p className="text-sm text-gray-500">Redirecionando para o Mercado Pago…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-1.5">
                Nome
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1F1F1F] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD43B] focus:border-transparent transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1F1F1F] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFD43B] focus:border-transparent transition-all"
              />
            </div>

            {/* Quantidade */}
            <div>
              <label className="block text-sm font-medium text-[#1F1F1F] mb-1.5">
                Quantidade de pixels
              </label>
              <input
                type="number"
                required
                min={1}
                max={available}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.min(available, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#FFD43B] focus:border-transparent transition-all"
              />
              <div className="flex gap-2 mt-2">
                {[10, 100, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setQuantidade(Math.min(available, preset))}
                    className={`flex-1 py-1 text-xs rounded-lg border transition-all font-medium ${
                      quantidade === preset
                        ? 'bg-[#FFD43B] border-[#FFD43B] text-[#1F1F1F]'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-[#FFD43B] hover:text-[#1F1F1F]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#FFF4B8]">
              <span className="text-sm text-[#9A6B00]">Total</span>
              <span className="text-lg font-bold text-[#1F1F1F]">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={quantidade < 1 || quantidade > available || !nome.trim() || !email.trim()}
              className="w-full py-3 rounded-xl bg-[#FFD43B] text-[#1F1F1F] font-semibold text-sm hover:bg-[#f5c800] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Pagar com Mercado Pago
            </button>

            <p className="text-center text-xs text-gray-400">
              Pagamento seguro via Mercado Pago · Os pixels são revelados após aprovação
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
