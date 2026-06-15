import { useState, useEffect, FormEvent, useRef } from 'react'

interface ModalProps {
  blockIndex: number
  availablePixels: number
  onClose: () => void
  onPurchase: (blockIndex: number, quantidade: number) => void
}

type Step = 'form' | 'brick' | 'success' | 'error'

interface BrickConfig {
  publicKey: string
  amount: number
  description: string
  blockRow: number
  blockCol: number
}

function getBlockRowCol(blockIndex: number): [number, number] {
  return [Math.floor(blockIndex / 10) + 1, (blockIndex % 10) + 1]
}

declare global {
  interface Window {
    MercadoPago: new (key: string) => {
      bricks: () => {
        create: (
          type: 'payment',
          containerId: string,
          config: Record<string, unknown>,
        ) => Promise<unknown>
      }
    }
  }
}

export default function Modal({ blockIndex, availablePixels, onClose, onPurchase }: ModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [errorMsg, setErrorMsg] = useState('')
  const [config, setConfig] = useState<BrickConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [pixPaymentId, setPixPaymentId] = useState<number | null>(null)
  const brickReady = useRef(false)

  const onPurchaseRef = useRef(onPurchase)
  onPurchaseRef.current = onPurchase
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const blockIndexRef = useRef(blockIndex)
  blockIndexRef.current = blockIndex
  const quantidadeRef = useRef(quantidade)
  quantidadeRef.current = quantidade

  const [blockRow, blockCol] = getBlockRowCol(blockIndex)
  const totalPrice = quantidade

  useEffect(() => {
    brickReady.current = false
  }, [])

  useEffect(() => {
    if (step !== 'brick' || !config || brickReady.current) return
    brickReady.current = true

    const mp = new window.MercadoPago(config.publicKey)
    const bricksBuilder = mp.bricks()

    bricksBuilder.create('payment', 'paymentBrick_container', {
      initialization: {
        amount: config.amount,
        payer: { email },
      },
      customization: {
        paymentMethods: {
          types: { included: ['credit_card', 'debit_card', 'pix'] },
        },
      },
      callbacks: {
        onSubmit: async ({ selectedPaymentMethod, formData }: { selectedPaymentMethod: string; formData: Record<string, unknown> }) => {
          const body: Record<string, unknown> = {
            ...formData,
            amount: config.amount,
            email,
            nome,
            description: config.description,
          }
          const res = await fetch('/api/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)

          if (selectedPaymentMethod === 'pix') {
            setPixPaymentId(data.id)
            return data
          }

          if (data.status === 'approved') {
            onPurchaseRef.current(blockIndexRef.current, quantidadeRef.current)
            setStep('success')
            setTimeout(() => onCloseRef.current(), 2500)
          } else {
            throw new Error(`Pagamento ${data.status}: ${data.statusDetail || ''}`)
          }
          return data
        },
        onReady: () => {},
        onError: (error: { message?: string }) => {
          setErrorMsg(error?.message || 'Erro no formulário de pagamento.')
          setStep('error')
        },
      },
    }).catch((error: { message?: string }) => {
      setErrorMsg(error?.message || 'Falha ao carregar formulário de pagamento.')
      setStep('error')
    })
  }, [step, config, email, nome])

  useEffect(() => {
    if (!pixPaymentId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/process-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkPaymentId: pixPaymentId }),
        })
        const data = await res.json()
        if (data.status === 'approved') {
          clearInterval(interval)
          onPurchaseRef.current(blockIndexRef.current, quantidadeRef.current)
          setStep('success')
          setTimeout(() => onCloseRef.current(), 2500)
        }
      } catch { /* keep polling */ }
    }, 3000)
    return () => clearInterval(interval)
  }, [pixPaymentId])

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!nome.trim()) { setErrorMsg('Informe seu nome.'); setStep('error'); return }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setErrorMsg('Informe um e-mail válido.'); setStep('error'); return }
    if (quantidade < 1 || quantidade > availablePixels) { setErrorMsg(`Escolha entre 1 e ${availablePixels} pixels.`); setStep('error'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/criar-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), quantidade, blockIndex }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Erro ao inicializar pagamento.')
      }
      const data: BrickConfig = await res.json()
      setConfig(data)
      setStep('brick')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado.')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onCloseRef.current}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-text/40 hover:text-text/80 hover:bg-gray-100 transition-colors"
          aria-label="Fechar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {(step === 'form' || step === 'error') && (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-sm font-medium text-text/70 mb-3">
                Bloco {blockRow} &times; {blockCol}
              </div>
              <h2 className="text-xl font-bold text-text">Comprar Pixels</h2>
            </div>

            {step === 'error' && errorMsg && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-text/70 mb-1">Nome</label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={e => { setNome(e.target.value); setStep('form') }}
                  placeholder="Seu nome"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text/70 mb-1">E-mail</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setStep('form') }}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="quantidade" className="block text-sm font-medium text-text/70 mb-1">Quantidade de Pixels</label>
                <input
                  id="quantidade"
                  type="number"
                  min={1}
                  max={availablePixels}
                  value={quantidade}
                  onChange={e => { setQuantidade(Math.max(1, Math.min(availablePixels, parseInt(e.target.value) || 1))); setStep('form') }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-sm"
                  disabled={loading}
                />
                <p className="text-xs text-text/40 mt-1">{availablePixels} pixels disponíveis neste bloco</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-text/60">Valor total</span>
                <span className="text-lg font-bold text-text">
                  {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-text font-bold text-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Aguarde...
                  </>
                ) : 'Continuar para pagamento'}
              </button>
            </form>
          </>
        )}

        {step === 'brick' && (
          <>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-sm font-medium text-text/70 mb-2">
                Bloco {blockRow} &times; {blockCol}
              </div>
              <h2 className="text-xl font-bold text-text">Finalizar Pagamento</h2>
              <p className="text-sm text-text/50 mt-1">
                {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div id="paymentBrick_container" />
            {pixPaymentId && (
              <p className="text-xs text-text/40 text-center mt-3">
                Ap&oacute;s pagar o Pix, aguarde a confirma&ccedil;&atilde;o autom&aacute;tica.
              </p>
            )}
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text mb-2">Pagamento Confirmado!</h2>
            <p className="text-sm text-text/50">{quantidade} pixel{quantidade > 1 ? 's' : ''} revelado{quantidade > 1 ? 's' : ''} no bloco {blockRow}&times;{blockCol}.</p>
          </div>
        )}
      </div>
    </div>
  )
}
