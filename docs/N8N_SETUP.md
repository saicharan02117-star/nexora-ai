# Nexora n8n Tool Bridge

Nexora keeps public web/search intelligence in the existing `/api/search` engine and routes private account actions through `/api/agent` into n8n.

## Flow

`Nexora UI -> /api/search -> Vercel rewrite -> /api/agent`

- Normal/general/shopping/current requests: delegated to the existing Nexora search engine.
- Gmail/Calendar/private document/database requests: routed to `N8N_WEBHOOK_URL`.

## n8n import

Import `n8n/nexora-agent-webhook.json` into n8n, then connect:

1. OpenAI credential to **OpenAI Chat Model**.
2. Google credential to **Search Gmail**, **Send Gmail**, **Calendar Availability**, and **Create Calendar Event**.
3. Activate the workflow and copy its production webhook URL.
4. Add that URL to the Nexora deployment as `N8N_WEBHOOK_URL`.
5. Optionally add the same bearer secret to n8n and Nexora as `N8N_WEBHOOK_SECRET`.

The workflow file is inactive and contains no credentials by design.

## Safety

Nexora does not treat model reasoning as proof that a private action occurred. The n8n tool must return a successful tool result before Nexora reports an email/event action as completed.
