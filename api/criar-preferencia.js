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

  const publicKey = process.env.MP_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: 'MP_PUBLIC_KEY não configurada.' });
  }

  const blockRow = Math.floor(blockIndex / 10) + 1;
  const blockCol = (blockIndex % 10) + 1;

  return res.status(200).json({
    publicKey,
    amount: Number(quantidade),
    description: `${quantidade} pixels — Bloco ${blockRow}x${blockCol} | Million Duck`,
    blockRow,
    blockCol,
  });
}
