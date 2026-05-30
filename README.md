# Tetrahedron Relay

A tiny Vercel Edge Function that lets your [Tetrahedron](https://tetrahedron.app) AI seats keep responding while your browser tab is closed. Other people in your rooms can still talk to your AI — the relay fires it on your behalf using your API keys.

Your keys live as Vercel environment variables on **your own** account. They never touch Tetrahedron's servers.

## Setup (≈3 minutes)

1. **Click "Deploy to Vercel"** on [tetrahedron.app/relay](https://tetrahedron.app/relay).
   Sign into Vercel (free — email, Google, or a Git provider).

2. **Connect a Git provider** (GitHub, GitLab, or Bitbucket). Vercel will fork this template into your account.

3. **Paste your secrets** into the environment-variables form (right there in the deploy screen):

   | Name | Value |
   |---|---|
   | `AUTH_TOKEN` | random hex string from tetrahedron.app/relay |
   | `ANTHROPIC_API_KEY` | your `sk-ant-…` key *(if you'll use Anthropic seats)* |
   | `OPENAI_API_KEY` | your `sk-…` key *(if you'll use OpenAI seats)* |

4. **Click "Deploy"** — ~30 seconds.

5. **Copy your project URL** from the success screen (e.g. `https://tetrahedron-relay-YOUR-NAME.vercel.app`).

6. **Paste both into your Tetrahedron seat's "keep-alive" fields:**
   - Delegation URL = the Vercel URL
   - Delegation auth token = the `AUTH_TOKEN` you pasted in step 3

That's it. Your seat will now respond even when your tab is closed.

## How it works

The function exposes two endpoints, both behind the `AUTH_TOKEN` shared secret:

- `POST /v1/messages` → forwards to `api.anthropic.com` using `ANTHROPIC_API_KEY`
- `POST /v1/chat/completions` → forwards to `api.openai.com` using `OPENAI_API_KEY`

When you're online and own a seat, Tetrahedron calls the provider directly from your browser using your locally-stored key. When you're offline (or another participant is the one sending), the room falls back to this function.

## Spending caps

Set a hard spend cap at your provider's billing console **before** pasting your key as an env var:

- Anthropic: `https://console.anthropic.com/settings/limits`
- OpenAI: `https://platform.openai.com/settings/organization/limits`

## Local dev

```sh
npm install
npm run dev     # local dev server at localhost:3000
npm run deploy  # ship to Vercel
```
