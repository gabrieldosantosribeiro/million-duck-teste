export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { nome, email, quantidade, blockIndex } = req.body ?? {}

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    return res.status(400).json({ error: 'Nome inválido.' })
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'E-mail inválido.' })
  }
  if (!quantidade || typeof quantidade !== 'number' || quantidade < 1 || quantidade > 10000) {
    return res.status(400).json({ error: 'Quantidade inválida (1–10.000).' })
  }
  if (blockIndex === undefined || blockIndex === null || typeof blockIndex !== 'number' || blockIndex < 0 || blockIndex > 99) {
    return res.status(400).json({ error: 'Bloco inválido.' })
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  const siteUrl = (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '')
  const webhookUrl = process.env.MP_WEBHOOK_URL || null
  const isSandbox = process.env.MP_SANDBOX === 'true'

  if (!accessToken) {
    return res.status(500).json({ error: 'Configuração de pagamento ausente.' })
  }

  const row = Math.floor(blockIndex / 10) + 1
  const col = (blockIndex % 10) + 1

  const preferenceBody = {
    items: [
      {
        id: `block-${blockIndex}`,
        title: `${quantidade} pixel${quantidade > 1 ? 's' : ''} — Bloco ${row}x${col} | Million Duck`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: parseFloat(quantidade.toFixed(2)), // garante float
      },
    ],
    payer: {
      name: nome.trim(),
      email: email.trim().toLowerCase(),
    },
    back_urls: {
      success: `${siteUrl}/?status=success&block=${blockIndex}&qty=${quantidade}`,
      failure: `${siteUrl}/?status=failure&block=${blockIndex}`,
      pending: `${siteUrl}/?status=pending&block=${blockIndex}`,
    },
    auto_return: 'approved',
    metadata: {
      block_index: blockIndex,
      pixel_quantity: quantidade,
    },
    external_reference: `block-${blockIndex}-${Date.now()}`,
    ...(webhookUrl && { notification_url: webhookUrl }),
  }

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferenceBody),
    })

    const preference = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('MP error:', JSON.stringify(preference))
      return res.status(502).json({
        error: 'Erro ao criar preferência no Mercado Pago.',
        details: preference, // agora aparece no console da Vercel
      })
    }

    const checkoutUrl = isSandbox
      ? preference.sandbox_init_point
      : preference.init_point

    if (!checkoutUrl) {
      console.error('MP sem checkoutUrl:', JSON.stringify(preference))
      return res.status(502).json({ error: 'URL de checkout não recebida do Mercado Pago.' })
    }

    return res.status(200).json({
      checkoutUrl,
      preferenceId: preference.id,
    })
  } catch (err) {
    console.error('Erro interno:', err)
    return res.status(500).json({ error: 'Erro interno do servidor.' })
  }
}