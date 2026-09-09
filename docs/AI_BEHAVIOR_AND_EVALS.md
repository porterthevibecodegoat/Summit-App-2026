# AI Behavior And Evals

AI is disabled by default and no model is hardcoded.

## Temporary No-Key Mode

- Attendee Ask AI currently uses deterministic local answers from the published schedule snapshot and approved public summit context.
- Attendee Ask AI includes clear temporary answers for foundation context, summit purpose, public featured figures, speaker appearance timing, registration/check-in, venue, wellness, meals, founder/VIP moments, and emergency boundaries.
- Staff State AI currently uses deterministic read-only answers about draft rows, review status, schedule conflicts, backend mode, notification metadata, import status, and attendee sync readiness.
- Staff Official Change AI currently creates deterministic proposals for safe schedule edits such as time, end-time shift, speaker, room, title, audience, and ready-status updates.
- Official Change AI requires an exact or uniquely strong target match. Missing or ambiguous sessions return a no-change warning rather than editing the first plausible row.
- Temporary AI does not call OpenAI, does not mutate production directly, and does not replace human review.
- `POST /api/ai/attendee` exists as the future server-side attendee concierge endpoint. It currently returns deterministic no-key answers from the published snapshot and public summit context.
- `POST /api/ai/state` is the read-only staff state endpoint.
- `POST /api/ai/operator/propose` is the staff official-change proposal endpoint.

Required behavior for future implementation:

- Attendee AI reads only approved published schedule, location, announcement, FAQ, and ICF content.
- Staff AI creates strict proposals only and never publishes from free text.
- OpenAI Responses API calls happen server-side with `store: false` by default.
- Structured outputs are validated before rendering or execution.
- Evaluation fixtures must cover typos, role restrictions, unpublished facts, changed/canceled events, prompt injection, and ambiguous admin commands.

## Credentials-Last Activation

Keep `ENABLE_AI=false` for the first deployed staging pass. Add `OPENAI_API_KEY` and the approved model only to the server environment, run deterministic and live-model evals, inspect redaction/retention behavior, then enable AI in staging. Attendee and staff fallback workflows must remain useful if the model provider is unavailable.
