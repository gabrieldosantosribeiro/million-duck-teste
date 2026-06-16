const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'GET') {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/pixels?select=block_index,revealed`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    })
    const rows = await response.json()
    const result = {}
    for (const row of rows) {
      result[row.block_index] = row.revealed
    }
    return res.status(200).json(result)
  }

  if (req.method === 'POST') {
    const { blockIndex, pixels } = req.body ?? {}

    console.log('SUPABASE_URL:', SUPABASE_URL)
    console.log('blockIndex:', blockIndex, 'pixels count:', pixels?.length)

    if (blockIndex === undefined || !Array.isArray(pixels)) {
      return res.status(400).json({ error: 'Dados inválidos.' })
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/pixels`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ block_index: blockIndex, revealed: pixels }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error('Supabase error:', err)
      return res.status(502).json({ error: 'Erro ao salvar pixels.' })
    }

    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Método não permitido.' })
}