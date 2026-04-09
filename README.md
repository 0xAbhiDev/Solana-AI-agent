# Blockchain AI Buddy

> **Live app → [https://blockchain-ai-buddy.vercel.app](https://blockchain-ai-buddy.vercel.app)**

A pay-per-prompt AI assistant built on Solana. Connect your wallet, pay a small fee in **SOL** or **USDC**, and get an instant AI-generated response — every query is provably recorded on-chain.

---

## Features

- 🔗 **Solana wallet integration** — supports all major Solana wallets via `@solana/wallet-adapter`
- 💸 **On-chain micropayments** — pay **0.02 SOL** or **1 USDC** per prompt
- 🤖 **AI responses** — powered by [Groq](https://groq.com/) (`llama-3.1-8b-instant`)
- 🗂️ **Prompt history** — all past prompts and AI answers are stored per wallet and can be cleared at any time
- 🗄️ **PostgreSQL + Prisma** — prompt records (wallet, tx signature, prompt, AI response) are persisted in a Postgres database

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Blockchain | [Solana web3.js](https://solana-labs.github.io/solana-web3.js/) + `@solana/wallet-adapter` |
| AI | [Groq SDK](https://groq.com/) — `llama-3.1-8b-instant` |
| Database | PostgreSQL via [Prisma](https://www.prisma.io/) |
| Monorepo | [Turborepo](https://turborepo.dev/) |
| Package manager | [Bun](https://bun.sh/) |
| Deployment | [Vercel](https://vercel.com/) |

---

## Repository Structure

```
.
├── apps/
│   └── web/           # Main Next.js application (Blockchain AI Buddy)
│       ├── app/
│       │   ├── page.tsx                 # Home page UI
│       │   ├── layout.tsx               # Root layout + wallet provider
│       │   ├── WalletButton.tsx         # Wallet connect button
│       │   ├── WalletContextProvider.tsx# Solana wallet adapter context
│       │   └── api/
│       │       ├── generate/route.ts    # POST — save prompt & call Groq AI
│       │       └── history/route.ts     # GET/DELETE — fetch or clear wallet history
│       ├── components/                  # Reusable UI components (shadcn/ui)
│       ├── lib/                         # Prisma client and utilities
│       └── prisma/
│           └── schema.prisma            # Agent model (wallet, tx, prompt, response)
└── packages/
    ├── ui/                # Shared React component library
    ├── eslint-config/     # Shared ESLint configuration
    └── typescript-config/ # Shared TypeScript configuration
```

---

## How It Works

1. **Connect Wallet** — the user connects a Solana wallet (Devnet USDC is supported via the Devnet USDC mint).
2. **Write a Prompt** — between 10 and 500 characters.
3. **Choose Payment** — pay **0.02 SOL** or **1 USDC**; the transaction is sent to the treasury wallet and confirmed on-chain.
4. **AI Response** — once the transaction is confirmed, the prompt is sent to Groq's API and the response is displayed and stored in the database alongside the transaction signature.
5. **History** — all previous prompts for the connected wallet are displayed and can be refreshed or cleared.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.3
- Node.js ≥ 18
- A PostgreSQL database
- A [Groq API key](https://console.groq.com/)

### Installation

```sh
git clone https://github.com/0xAbhiDev/Solana-AI-agent.git
cd Solana-AI-agent
bun install
```

### Environment Variables

Create `apps/web/.env` with the following:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
GROQ_API_KEY="your_groq_api_key"
```

### Database Setup

```sh
cd apps/web
bunx prisma db push
```

### Development

```sh
# Run all apps
bun run dev

# Run only the web app
turbo dev --filter=web
```

### Build

```sh
bun run build
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/generate` | Accepts `{ prompt, txSignature, payerPublicKey }`, saves the record, calls Groq, and returns the AI response. |
| `GET` | `/api/history?wallet=<pubkey>` | Returns the last 20 prompts for the given wallet. |
| `DELETE` | `/api/history?wallet=<pubkey>` | Deletes all prompt records for the given wallet. |

---

## Database Schema

```prisma
model Agent {
  id          Int      @id @default(autoincrement())
  userWallet  String
  txSignature String   @unique
  promptText  String
  aiResponse  String
  createdAt   DateTime @default(now())
}
```

---

## License

MIT
