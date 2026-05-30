# Tetrahedron Relay

A tiny edge function that lets your [Tetrahedron](https://tetrahedron.app) AI seats
keep responding while your browser tab is closed. Other people in your rooms can
still talk to your AI — the relay fires it on your behalf using your API keys.

**Your keys live on YOUR account** (Vercel or Cloudflare). They never touch Tetrahedron's servers.

Two endpoints, both behind a shared `AUTH_TOKEN`:

- `POST /v1/messages` → forwards to `api.anthropic.com` using `ANTHROPIC_API_KEY`
- `POST /v1/chat/completions` → forwards to `api.openai.com` using `OPENAI_API_KEY`

Three ways to deploy. Pick whichever matches your style.

---

## Path A — Vercel (one-click, no terminal)

The recommended path for most users. See the guided wizard at
[tetrahedron.app/relay](https://tetrahedron.app/relay) — it walks you through it.

Or use the deploy button directly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FTetrahedronapp%2Ftetrahedron-relay)

When prompted, paste:

- `AUTH_TOKEN` — from `tetrahedron.app/relay`
- `ANTHROPIC_API_KEY` — your `sk-ant-…` key (or `unused` if not using Anthropic)
- `OPENAI_API_KEY` — your `sk-…` key (or `unused` if not using OpenAI)

Vercel will require all three to be non-empty. The relay only errors if you actually try to call a provider whose key is bogus, so `unused` works as a placeholder.

---

## Path B — Cloudflare Workers via CLI (~5 min, fastest for terminal users)

Requires Node.js installed.

```bash
# 1. Get the code
git clone https://github.com/Tetrahedronapp/tetrahedron-relay
cd tetrahedron-relay

# 2. Authenticate with Cloudflare (opens browser, OAuth)
npx wrangler login

# 3. Set your secrets (paste each value when prompted)
npx wrangler secret put AUTH_TOKEN
npx wrangler secret put ANTHROPIC_API_KEY     # or skip if not using Anthropic
npx wrangler secret put OPENAI_API_KEY        # or skip if not using OpenAI

# 4. Deploy
npx wrangler deploy
```

Wrangler prints your Worker URL when deploy finishes — something like
`https://tetrahedron-relay.YOUR-USERNAME.workers.dev`. Paste that into your
Tetrahedron seat's "delegation URL" field; paste the same `AUTH_TOKEN` you set in
step 3 into the "delegation auth token" field.

---

## Path C — Cloudflare dashboard, manual (no terminal)

If you don't have Node or just prefer clicking:

1. Sign up at <https://dash.cloudflare.com> (free).
2. **Workers & Pages** → **Create application** → **Create Worker**. Name it `tetrahedron-relay` (or whatever) and hit **Deploy**.
3. Open the new Worker → **Edit code** (button top-right). Delete the placeholder code in the editor.
4. Copy the contents of [`src/index.ts`](src/index.ts) from this repo and paste into the editor. Hit **Deploy**.
5. Go to **Settings** → **Variables and Secrets** → **Add variable**. For each of these, set Type = **Secret** (Encrypted) and add:
   - `AUTH_TOKEN` = the token from `tetrahedron.app/relay`
   - `ANTHROPIC_API_KEY` = your `sk-ant-…` key *(skip if not using Anthropic)*
   - `OPENAI_API_KEY` = your `sk-…` key *(skip if not using OpenAI)*
6. Hit **Deploy** again so the new secrets take effect.
7. Copy the `*.workers.dev` URL from the Worker overview page. Paste it (and the same `AUTH_TOKEN`) into your Tetrahedron seat.

---

## Spending caps — set these first

Before pasting any API key as a secret, cap your provider account:

- **Anthropic:** <https://console.anthropic.com/settings/limits>
- **OpenAI:** <https://platform.openai.com/settings/organization/limits>

If your relay ever leaks or gets misused, the cap is your backstop.

---

## How it works

When you're online and own a seat in Tetrahedron, your browser calls the AI
provider directly using your locally-stored key (fastest path, doesn't touch
the relay). When you're offline — or another participant is the one sending —
the room falls back to your relay, which forwards using the key on your account.

The relay is stateless. It holds no message history; it only forwards.
