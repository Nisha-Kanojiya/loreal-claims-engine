import { useState } from 'react';

const CLAIM_TYPES = [
  ['ANTI_AGING', 'Anti-aging'],
  ['HYDRATION', 'Hydration'],
  ['BRIGHTENING', 'Brightening'],
  ['UV_PROTECTION', 'UV protection'],
  ['HAIR_REPAIR', 'Hair repair'],
  ['SENSITIVE_SKIN', 'Sensitive skin'],
];

const EXAMPLE = {
  productName: 'Revitalift Pro-Retinol Serum 2.0',
  claimText: 'Reduces the appearance of wrinkles by 20% in 4 weeks',
  claimType: 'ANTI_AGING',
  formula: 'Aqua, Glycerin, Retinol 0.3%, Niacinamide 2%, Hyaluronic Acid 0.5%, Dimethicone, Tocopherol',
};

const EMPTY = { productName: '', claimText: '', claimType: 'ANTI_AGING', formula: '' };

/** Scientist responsibility: create and submit the claim. No clinical study fields here. */
export default function ClaimForm({ onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);
    const ok = await onSubmit({
      productName: form.productName,
      claimText: form.claimText,
      claimType: form.claimType,
      formula: form.formula || undefined,
    });
    setSubmitting(false);
    if (ok) {
      setSuccess(true);
      setForm(EMPTY);
    }
  };

  return (
    <form className="panel assess-form" data-testid="scientist-claim-form" onSubmit={submit}>
      <div className="form-head">
        <h2 className="panel-title">Submit New Claim</h2>
        <button type="button" className="ghost-btn" data-testid="load-scientist-example-btn" onClick={() => setForm(EXAMPLE)}>
          Load example
        </button>
      </div>
      <p className="panel-hint">Create and submit the claim — clinical evaluation happens later, by an evaluator.</p>

      <fieldset className="fieldset owned">
        <legend>
          Claim &amp; Formula <span className="owner-tag">Scientist input</span>
        </legend>
        <label>
          Product name
          <input data-testid="product-name-input" required maxLength={200} value={form.productName} onChange={set('productName')} placeholder="e.g. Revitalift Pro-Retinol Serum 2.0" />
        </label>
        <label>
          Claim
          <input data-testid="claim-text-input" required maxLength={500} value={form.claimText} onChange={set('claimText')} placeholder="e.g. Reduces wrinkles by 20% in 4 weeks" />
        </label>
        <div className="grid-2">
          <label>
            Claim type
            <select data-testid="claim-type-select" value={form.claimType} onChange={set('claimType')}>
              {CLAIM_TYPES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Formula (INCI, optional)
            <input data-testid="formula-input" maxLength={4000} value={form.formula} onChange={set('formula')} placeholder="Aqua, Glycerin, Retinol 0.3%…" />
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="submit-btn" data-testid="submit-claim-btn" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Claim'}
        </button>
      </div>

      {success && (
        <div className="success-alert" data-testid="claim-success-msg" role="status">
          Claim submitted and is now awaiting clinical evaluation.
        </div>
      )}
    </form>
  );
}
