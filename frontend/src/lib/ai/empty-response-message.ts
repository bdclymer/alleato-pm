// User-facing message shown when the AI model produced no text on a turn.
//
// This must NOT blindly blame billing. The old inline version always said
// "out of credits / over quota / blocked by billing" regardless of the real
// cause, which was wrong whenever the failure was a swallowed provider/stream
// error or a tool-schema problem — e.g. session d87edc77, where the same AI
// Gateway had answered the prior turn seconds earlier. Use the captured
// `streamText.onError` message to explain what actually happened; only invoke
// the billing wording when the error text itself looks like a quota/billing
// signal.

const BILLING_SIGNAL =
  /\b(quota|billing|insufficient|credit|payment|rate limit|429|exceeded)\b/i;

/**
 * Build the assistant message persisted/shown when the model yields empty text.
 * @param streamErrorMessage the message captured by streamText.onError, or null
 *   when the stream ended with no error event.
 */
export function buildEmptyResponseMessage(
  streamErrorMessage: string | null,
): string {
  if (streamErrorMessage) {
    if (BILLING_SIGNAL.test(streamErrorMessage)) {
      return `The AI provider rejected the request: ${streamErrorMessage}. This points to a quota, rate-limit, or billing issue. I saved your question — retry once it clears, or pick a different model.`;
    }
    return `The assistant hit an error before it could answer: ${streamErrorMessage}. I saved your question so it is not lost — retry, or pick a different model if it persists.`;
  }
  return "The AI provider returned an empty response with no error. I saved your question so it is not lost — please retry, or pick a different model. If this keeps happening, the model call is failing silently and needs a look.";
}
