# Shitty Translate

A Next.js App Router translator that uses:

- Amazon Bedrock
- the Vercel AI SDK
- a Google Translate-style split layout
- standard target languages plus a custom free-form target prompt

## Required environment variables

Set these in Vercel:

- `AWS_REGION`
- `AWS_BEARER_TOKEN_BEDROCK` (recommended)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN` (optional)
- `BEDROCK_MODEL_ID` (optional)

Default model:

- `us.anthropic.claude-opus-4-6-v1`

The Bedrock provider will prefer `AWS_BEARER_TOKEN_BEDROCK` when present and
fall back to the standard AWS credential variables otherwise.

## Local development

```bash
npm install
npm run dev
```

Use Node 20+ locally. Vercel's default Node runtime is fine for this app.

## Deployment

This is ready for Vercel as a normal Next.js app. Import the repo into Vercel, add the Bedrock env vars above, and deploy.
