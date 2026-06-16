# 🦆 Million Duck

Uma imagem secreta composta por 1.000.000 de pixels. Compre pixels para revelá-la.

## Como funciona

- A imagem `/public/pato.png` começa completamente branca
- A grade 10×10 divide a imagem em 100 blocos de 10.000 pixels cada
- Cada pixel custa R$ 1,00
- Após o pagamento via Mercado Pago, os pixels comprados são revelados aleatoriamente no bloco escolhido

---

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Adicionar a imagem secreta

Coloque sua imagem em `/public/pato.png`.
- Dimensões recomendadas: **1000×1000 pixels** (exatamente)
- Formatos: PNG ou JPG
- Se não houver imagem, um placeholder colorido é usado automaticamente

### 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo e preencha com seus dados:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
MP_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxx   # Seu token do Mercado Pago
MP_SANDBOX=true                             # true para testes, false para produção
SITE_URL=http://localhost:5173              # URL local durante dev
MP_WEBHOOK_URL=                             # Deixe vazio durante dev
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

> **Nota:** A função serverless `/api/criar-preferencia` só funciona no Vercel ou com `vercel dev`. Para testar localmente, instale a Vercel CLI:
> ```bash
> npm i -g vercel
> vercel dev
> ```

---

## Deploy na Vercel

### 1. Instalar Vercel CLI

```bash
npm i -g vercel
```

### 2. Fazer login

```bash
vercel login
```

### 3. Deploy

```bash
vercel --prod
```

### 4. Configurar variáveis de ambiente na Vercel

No painel da Vercel (vercel.com), vá em:
**Settings → Environment Variables** e adicione:

| Variável | Valor |
|----------|-------|
| `MP_ACCESS_TOKEN` | Seu token de produção do Mercado Pago |
| `MP_SANDBOX` | `false` (produção) ou `true` (testes) |
| `SITE_URL` | `https://seu-dominio.vercel.app` |
| `MP_WEBHOOK_URL` | `https://seu-dominio.vercel.app/api/webhook` (opcional) |

---

## Obtendo credenciais do Mercado Pago

1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Crie uma aplicação
3. Copie o **Access Token** (começa com `TEST-` para sandbox, `APP_USR-` para produção)

---

## Estrutura do projeto

```
million-duck/
├── api/
│   └── criar-preferencia.js    ← Serverless function (Mercado Pago)
├── public/
│   └── pato.png                ← Sua imagem secreta (adicionar manualmente)
├── src/
│   ├── components/
│   │   ├── PixelGrid.tsx       ← Canvas com reveal de pixels
│   │   └── Modal.tsx           ← Modal de compra + Mercado Pago
│   ├── App.tsx                 ← Estado principal + lógica de reveal
│   ├── main.tsx
│   └── index.css
├── .env.example
├── vercel.json
└── package.json
```

---

## Tecnologias

- React 18 + TypeScript + Vite
- TailwindCSS
- Mercado Pago Checkout Pro
- Vercel Serverless Functions
