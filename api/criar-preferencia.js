const MP_API_URL = 'https://api.mercadopago.com/checkout/preferences';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nome, email, quantidade, blockIndex } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }
  if (!quantidade || quantidade < 1 || quantidade > 10000) {
    return res.status(400).json({ error: 'Quantidade deve ser entre 1 e 10000.' });
  }
  if (blockIndex === undefined || blockIndex === null || blockIndex < 0 || blockIndex > 99) {
    return res.status(400).json({ error: 'Bloco inválido.' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado.' });
  }

  const siteUrl = process.env.SITE_URL || 'http://localhost:5173';
  const isSandbox = process.env.MP_SANDBOX === 'true';
  const webhookUrl = process.env.MP_WEBHOOK_URL || '';

  const blockRow = Math.floor(blockIndex / 10) + 1;
  const blockCol = (blockIndex % 10) + 1;

  const preference = {
    items: [
      {
        title: `${quantidade} pixels — Bloco ${blockRow}×${blockCol} | Million Duck`,
        unit_price: Number(quantidade),
        quantity: 1,
        currency_id: 'BRL',
      },
    ],
    payer: {
      name: nome.trim(),
      email: email.trim(),
    },
    back_urls: {
      success: `${siteUrl}?status=success&block=${blockIndex}&qty=${quantidade}`,
      failure: `${siteUrl}?status=failure`,
      pending: `${siteUrl}?status=pending`,
    },
    auto_return: 'approved',
    metadata: {
      block_index: blockIndex,
      pixel_quantity: quantidade,
    },
  };

  if (webhookUrl) {
    preference.notification_url = webhookUrl;
  }

  try {
    const mpRes = await fetch(MP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const errorBody = await mpRes.text().catch(() => '');
      console.error('Mercado Pago API error:', mpRes.status, errorBody);
      return res.status(502).json({ error: 'Erro ao comunicar com Mercado Pago.' });
    }

    const mpData = await mpRes.json();
    const checkoutUrl = isSandbox ? mpData.sandbox_init_point : mpData.init_point;

    return res.status(200).json({
      checkoutUrl,
      preferenceId: mpData.id,
    });
  } catch (err) {
    console.error('Error creating preference:', err);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
