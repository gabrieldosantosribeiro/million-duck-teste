const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado.' });

  const { checkPaymentId } = req.body;

  // --- Route: check existing payment status (Pix polling) ---
  if (checkPaymentId) {
    try {
      const mpRes = await fetch(`${MP_API_URL}/${checkPaymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const text = await mpRes.text();
      if (!mpRes.ok) return res.status(502).json({ error: `Erro ao consultar pagamento: ${text.slice(0, 500)}` });
      const data = JSON.parse(text);
      return res.status(200).json({
        id: data.id,
        status: data.status,
        statusDetail: data.status_detail,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao consultar pagamento', detail: err instanceof Error ? err.message : '' });
    }
  }

  // --- Route: create a new payment ---
  const { token, payment_method_id, issuer_id, installments, amount, email, nome, description, identification } = req.body;

  if (!amount || amount < 1) return res.status(400).json({ error: 'Valor inválido.' });
  if (!email) return res.status(400).json({ error: 'E-mail do pagador é obrigatório.' });
  if (!payment_method_id) return res.status(400).json({ error: 'Método de pagamento não informado.' });

  const payment = {
    transaction_amount: Number(amount),
    description: description || `${amount} pixels — Million Duck`,
    payment_method_id,
    payer: { email, ...(nome ? { first_name: nome.trim() } : {}) },
  };

  if (payment_method_id !== 'pix') {
    if (!token) return res.status(400).json({ error: 'Token do cartão é obrigatório.' });
    payment.token = token;
    payment.installments = installments || 1;
    if (issuer_id) payment.issuer_id = issuer_id;
  }

  if (identification?.type && identification?.number) {
    payment.payer.identification = identification;
  }

  try {
    const mpRes = await fetch(MP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Idempotency-Key': `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      body: JSON.stringify(payment),
    });

    const responseText = await mpRes.text();
    if (!mpRes.ok) {
      console.error('MP payment error:', mpRes.status, responseText);
      return res.status(502).json({ error: `Erro ao processar pagamento: ${responseText.slice(0, 500)}` });
    }

    const paymentData = JSON.parse(responseText);

    return res.status(200).json({
      id: paymentData.id,
      status: paymentData.status,
      statusDetail: paymentData.status_detail,
      transactionAmount: paymentData.transaction_amount,
      paymentMethodId: paymentData.payment_method_id,
      ...(paymentData.point_of_interaction?.transaction_data
        ? { transactionData: paymentData.point_of_interaction.transaction_data }
        : {}),
    });
  } catch (err) {
    console.error('Error processing payment:', err);
    return res.status(500).json({ error: 'Erro interno do servidor', detail: err instanceof Error ? err.message : '' });
  }
}
