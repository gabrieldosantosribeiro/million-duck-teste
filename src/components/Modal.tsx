import { useState, FormEvent } from 'react'

interface ModalProps {
  blockIndex: number
  availablePixels: number
  onClose: () => void
  onPurchase: (blockIndex: number, quantidade: number) => void
}

type ModalState = 'form' | 'loading' | 'error'

function getBlockRowCol(blockIndex: number): [number, number] {
  return [Math.floor(blockIndex / 10) + 1, (blockIndex % 10) + 1]
}

export default function Modal({ blockIndex, availablePixels, onClose }: ModalProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [state, setState] = useState<ModalState>('form')
  const [errorMsg, setErrorMsg] = useState('')

  const [blockRow, blockCol] = getBlockRowCol(blockIndex)
  const totalPrice = quantidade

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) {
      setErrorMsg('Informe seu nome.')
      setState('error')
      return
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Informe um e-mail válido.')
      setState('error')
      return
    }
    if (quantidade < 1 || quantidade > availablePixels) {
      setErrorMsg(`Escolha entre 1 e ${availablePixels} pixels.`)
      setState('error')
      return
    }

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/criar-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          quantidade,
          blockIndex,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg = errData.detail ? `${errData.error}: ${errData.detail}` : (errData.error || 'Erro ao criar preferência de pagamento.')
        throw new Error(msg)
      }

      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('URL de checkout não recebida.')
      }
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-text/40 hover:text-text/80 hover:bg-gray-100 transition-colors"
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-sm font-medium text-text/70 mb-3">
            Bloco {blockRow} &times; {blockCol}
          </div>
          <h2 className="text-xl font-bold text-text">Comprar Pixels</h2>
        </div>

        {state === 'error' && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-text/70 mb-1">Nome</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={e => { setNome(e.target.value); setState('form') }}
              placeholder="Seu nome"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
              disabled={state === 'loading'}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text/70 mb-1">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setState('form') }}
              placeholder="seu@email.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
              disabled={state === 'loading'}
            />
          </div>

          <div>
            <label htmlFor="quantidade" className="block text-sm font-medium text-text/70 mb-1">
              Quantidade de Pixels
            </label>
            <input
              id="quantidade"
              type="number"
              min={1}
              max={availablePixels}
              value={quantidade}
              onChange={e => { setQuantidade(Math.max(1, Math.min(availablePixels, parseInt(e.target.value) || 1))); setState('form') }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
              disabled={state === 'loading'}
            />
            <p className="text-xs text-text/40 mt-1">
              {availablePixels} pixels disponíveis neste bloco
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-text/60">Valor total</span>
            <span className="text-lg font-bold text-text">
              {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-3 rounded-xl bg-primary text-text font-bold text-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {state === 'loading' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                Aguarde...
              </>
            ) : (
              'Pagar com Mercado Pago'
            )}
          </button>
        </form>

        <p className="text-xs text-text/30 text-center mt-4">
          Pagamento processado pelo Mercado Pago. Voc&ecirc; ser&aacute; redirecionado ap&oacute;s a confirma&ccedil;&atilde;o.
        </p>
      </div>
    </div>
  )
}
