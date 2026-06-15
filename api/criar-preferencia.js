const MP_API_URL = 'https://api.mercadopago.com/checkout/preferences';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host || 'localhost:5173'}`;
  const isSandbox = process.env.MP_SANDBOX === 'true';

  const blockRow = Math.floor(blockIndex / 10) + 1;
  const blockCol = (blockIndex % 10) + 1;

  const preference = {
    items: [
      {
        title: `${quantidade} pixels — Bloco ${blockRow}x${blockCol} | Million Duck`,
        unit_price: Number(quantidade),
        quantity: 1,
        currency_id: 'BRL',
      },
    ],
    payer: {
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

  const webhookUrl = process.env.MP_WEBHOOK_URL;
  if (webhookUrl) {
    preference.notification_url = webhookUrl;
  }

  try {
    console.log('Sending to MP:', JSON.stringify({ ...preference, items: [{ ...preference.items[0], title: '...' }] }));

    const mpRes = await fetch(MP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    });

    const responseText = await mpRes.text();

    if (!mpRes.ok) {
      console.error('Mercado Pago error:', mpRes.status, responseText);
      const detail = responseText.slice(0, 500);
      return res.status(502).json({
        error: `Mercado Pago retornou erro ${mpRes.status}: ${detail}`,
      });
    }

    let mpData;
    try {
      mpData = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: 'Resposta inválida do Mercado Pago.' });
    }

    const checkoutUrl = isSandbox ? mpData.sandbox_init_point : mpData.init_point;

    if (!checkoutUrl) {
      return res.status(502).json({ error: 'Mercado Pago não retornou URL de checkout.' });
    }

    return res.status(200).json({
      checkoutUrl,
      preferenceId: mpData.id,
    });
  } catch (err) {
    console.error('Error creating preference:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor.',
      detail: err instanceof Error ? err.message : 'Erro desconhecido',
    });
  }
}
