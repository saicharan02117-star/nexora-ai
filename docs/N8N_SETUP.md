# Nexora AI — n8n Tool Agent Setup

This repository includes an importable n8n workflow at `n8n/nexora-agent-webhook.json`.

## Architecture

```text
Nexora Chat UI
  -> /api/search
  -> Intent + Tool Router
     -> OpenAI Responses API for reasoning and live web search
     -> n8n webhook for private/action tools
        -> OpenAI Chat Model
        -> Simple Memory
        -> Gmail search/send
        -> Google Calendar availability/create
        -> Calculator
  -> Nexora response
```

## 1. Import the workflow

1. Open n8n.
2. Create a workflow and choose **Import from File**.
3. Import `n8n/nexora-agent-webhook.json`.
4. Attach your OpenAI credential to **OpenAI Chat Model**.
5. Attach your Google credential to **Search Gmail**, **Send Gmail**, **Calendar Availability**, and **Create Calendar Event**.
6. Save the workflow.

The workflow is intentionally inactive in source control so credentials are never embedded in GitHub.

## 2. Activate and copy the production webhook URL

The Webhook node path is:

```text
nexora-agent
```

After activating the n8n workflow, copy its production webhook URL and configure it in the Nexora deployment as:

```env
N8N_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/nexora-agent
```

Optional shared-secret authentication:

```env
N8N_WEBHOOK_SECRET=replace-with-a-long-random-secret
```

If a secret is configured, Nexora sends it as a Bearer token.

## 3. Configure the Nexora model

Recommended production variables:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.6
N8N_WEBHOOK_URL=https://YOUR-N8N-HOST/webhook/nexora-agent
N8N_WEBHOOK_SECRET=your_private_bridge_secret
```

The existing Vercel AI Gateway path remains available as a fallback.

## 4. Automatic routing examples

| User request | Automatic route |
| --- | --- |
| `Explain recursion` | `general_chat` |
| `Latest AI news today` | `web_search` |
| `Best slippers under ₹1500` | `shopping_search + web_search` |
| `Check my unread Gmail` | `gmail -> n8n` |
| `Send an email to ...` | `gmail -> n8n` |
| `Am I free tomorrow at 4 PM?` | `calendar -> n8n` |
| `Schedule a meeting tomorrow` | `calendar -> n8n` |
| `What is 17% of 8400?` | `calculator` |

## 5. Important production rules

- Never place Google, OpenAI, n8n, Razorpay, or other secrets in GitHub.
- Keep automatic payments disabled by default.
- Gmail and Calendar actions are executed only through the private tool bridge.
- The AI must not claim an email/event was created unless n8n returns a successful tool result.
- Shopping results must use live sources for exact product names, current prices, stock, seller pages, and links.
- New budget or product constraints in a follow-up override old values while preserving the active product/topic.

## Next connectors

The same n8n tool-agent can be extended with Drive/Docs, Sheets, Slack, databases, CRM, notifications, and approved third-party APIs without changing the Nexora chat interface.
