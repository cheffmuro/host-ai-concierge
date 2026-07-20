# Anfitrião

> Repo: [`cheffmuro/host-ai-concierge`](https://github.com/cheffmuro/host-ai-concierge) · Path padrão na VPS: `/opt/host-ai-concierge` · Docker project: `host-ai-concierge`

Concierge de atendimento omnichannel com IA (Chatwoot + Dify + Evolution API)
e front em React/TanStack Start.

## Estrutura do repositório

```
.
├── src/                  Front-end (React 19 + TanStack Start + Tailwind)
└── infra/                Stack Docker da VPS (Chatwoot + Dify + Evolution + Caddy)
    ├── docker-compose.yml
    ├── .env.example
    └── scripts/          bootstrap | backup | validate
```

## Quickstart

### 1. Front (Vercel)

Configure as variáveis `VITE_*` em **Settings → Environment Variables** (ver
`.env.example`) e faça deploy. O front cai em mock se as URLs do back não
estiverem definidas — útil para preview.

### 2. Back (VPS)

```bash
git clone https://github.com/cheffmuro/host-ai-concierge.git /opt/host-ai-concierge
cd /opt/host-ai-concierge/infra
cp .env.example .env && nano .env
bash scripts/bootstrap.sh
```

Detalhes completos em [`infra/README.md`](./infra/README.md).

## Desenvolvimento local

```bash
bun install
bun run dev
```

## Stack

- **Front**: React 19, TanStack Start, Tailwind v4, shadcn/ui
- **Atendimento**: Chatwoot (multi-canal + agentes humanos)
- **IA / RAG**: Dify (Knowledge Base + chat completion)
- **WhatsApp**: Evolution API
- **Proxy/TLS**: Caddy
