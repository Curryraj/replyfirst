# ReplyFirst — demand-test demo

A public, try-it-yourself demo of instant AI reply for Malaysian SMEs. Built to be the
**prospecting tool, the content asset, and the demand test** at once — before there is a
single client.

The thing being tested: *do business owners actually care about response time enough to
ask for this?* If nobody tries it and nobody DMs, that's a real answer, cheaply bought.

## Run it locally

```bash
node dev-server.js
```

Needs `GEMINI_API_KEY` in the environment (already set on this machine). Opens on
port 3001, or the next free port.

## Deploy it publicly

```bash
npx vercel --prod
```

Then in the Vercel dashboard → Settings → Environment Variables, add `GEMINI_API_KEY`.
The `api/chat.js` file is picked up as a serverless function automatically;
`dev-server.js` is not used in production.

Put the resulting URL in the Instagram bio and in LinkedIn post comments.

## How it's put together

| File | Role |
|---|---|
| `public/index.html` | The whole front end — page chrome plus the WhatsApp-styled demo |
| `api/chat.js` | Serverless function; holds the API key, walks a model fallback chain |
| `api/niches.js` | **The file you edit.** All three business personas live here |
| `dev-server.js` | Local-only server so it runs with plain Node, no Vercel CLI |

### Switching or adding a niche

Everything niche-specific is in `api/niches.js` (the AI's context) and the `NICHE_UI`
object at the top of the `<script>` in `index.html` (what the phone displays). Copy any
existing block to add a fourth. Nothing else changes.

This is deliberate: the niche isn't locked yet, so the demo can pitch all three and let
the response tell you which one people actually want.

## Design decisions worth knowing

- **The response timer is the product.** Every reply is stamped with its real measured
  latency, and the before/after panel puts it against the 2–4 hour industry norm. That
  number is the entire pitch — protect it.
- **WhatsApp's real palette and system fonts inside the phone frame only.** A KL agency
  owner has to recognise it instantly as the tool they already use. Everything outside
  the frame uses the project's own blue/orange system.
- **No fake credentials.** The design system recommended trust badges and certificates;
  those were dropped deliberately. There is nothing to certify yet, and inventing proof
  contradicts the honesty rule in `reactivate/SPEC.md` §10.
- **Model fallback chain.** Free-tier quotas move around. If the first model 429s the
  handler silently tries the next, so a demo link posted to Instagram doesn't die
  mid-launch.

## Verified 2026-08-06

Tested live against the real API, not asserted:

- Property: 0.9–1.1s replies, correct price/parking/maintenance pulled from context,
  conversation memory intact across turns, each reply advanced toward a viewing
- Clinic: an urgent-symptom message ("chest pain, can't breathe") correctly **refused to
  book**, directed to A&E, and cited 999
- Contrast ≥ 4.5:1 in both light and dark (lowest measured 6.96:1)
- All tap targets ≥ 44px; no horizontal scroll at 375px
- Zero console errors; Poppins / Open Sans / mono / system-chat all rendering as intended

**Not verified:** nobody has actually *looked* at this. The browser tool in this
environment can't composite screenshots, so the layout has been measured, never seen.
Open it and judge it yourself before posting the link anywhere.

Also unverified: pressing Enter to send. The automation harness can't trigger native form
submission, so the click path was tested instead. The markup is correct for implicit
submission, but confirm it by hand.
