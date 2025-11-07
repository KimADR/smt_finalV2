# Hugging Face AI integration (Quick start)

This project uses Next.js (app router). The recommended pattern is to keep your HF API key server-side and create a server route that proxies requests to the Hugging Face Inference API. This repository includes a minimal example:

- `app/api/ai/route.ts` — a server route that forwards `input` and optional `model` to Hugging Face.
- `components/ai-chat.tsx` — a tiny client chat UI that calls `/api/ai`.

## Setup

1. Create or update `.env.local` in the project root and add your Hugging Face API key:

```
HF_API_KEY=hf_xxxYOURKEYxxx
```

2. Choose a model. The example uses `gpt2` by default. Replace `DEFAULT_MODEL` in `app/api/ai/route.ts` or pass `model` from the client. NOTE: some HF models require paid access or specific input shapes.

3. Start dev server:

```
pnpm dev
```

4. Use the component in a page (example):

```tsx
import AIChat from '@/components/ai-chat';

export default function Page() {
  return <AIChat defaultModel="gpt2" />;
}
```

## Security notes

- Never expose `HF_API_KEY` to the browser. Always call HF from server-side code (API route or server components).
- Monitor usage and costs in Hugging Face account if using models with paid inference.

## Next steps / improvements

- Add streaming (SSE or server-sent streaming) for large models.
- Integrate conversation memory / chat history persisted to a DB.
- Use the `@huggingface/inference` or `huggingface` SDK server-side for richer features (authentication, retries).
- Consider hosted endpoints (Hugging Face Inference endpoint or Vercel serverless) for production.

If you'd like, I can:

- wire the chat UI into an existing page (tell me which page),
- add streaming responses, or
- switch the server route to use the Hugging Face Hub SDK.
