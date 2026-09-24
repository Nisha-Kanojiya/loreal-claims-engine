async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data;
}

export const fetchClaims = () => fetch('/api/claims').then(handle);

export const fetchClaim = (id) => fetch(`/api/claims/${id}`).then(handle);

/** Scientist: create a claim (no evidence, no LLM call). */
export const createClaim = (payload) =>
  fetch('/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(handle);

/** Evaluator: attach clinical evidence to an existing claim and run the AI assessment. */
export const assessClaim = (id, evidence) =>
  fetch(`/api/claims/${id}/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evidence),
  }).then(handle);
