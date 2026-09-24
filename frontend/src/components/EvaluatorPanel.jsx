import { useState } from 'react';

const EXAMPLE = {
  studyTitle: 'Randomized double-blind vehicle-controlled study of 0.3% retinol serum (N=120)',
  methodology:
    '120 female volunteers aged 40-60 applied the serum twice daily for 4 weeks. Wrinkle depth was measured using PRIMOS 3D optical profilometry at baseline and week 4, plus expert-graded standardized photography.',
  resultsSummary:
    'Mean wrinkle depth reduction of 21.3% versus 3.1% for vehicle (p<0.001). 87% of subjects showed measurable improvement. No significant irritation events; 2 unrelated dropouts.',
  sampleSize: '120',
  durationWeeks: '4',
};

const EMPTY = { studyTitle: '', methodology: '', resultsSummary: '', sampleSize: '', durationWeeks: '' };

function ClaimInfoCard({ claim }) {
  return (
    <div className="claim-info" data-testid="eval-claim-info">
      <dl>
        <div>
          <dt>Product</dt>
          <dd>{claim.productName}</dd>
        </div>
        <div>
          <dt>Claim</dt>
          <dd>“{claim.claimText}”</dd>
        </div>
        <div>
          <dt>Claim type</dt>
          <dd>{claim.claimType}</dd>
        </div>
        <div>
          <dt>Formula (INCI)</dt>
          <dd>{claim.formula ?? '—'}</dd>
        </div>
        <div>
          <dt>Submitted by</dt>
          <dd>{claim.submittedBy}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{claim.status}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Evaluator responsibility: review a submitted claim and attach clinical evidence. Claim data is read-only. */
export default function EvaluatorPanel({ claims, onAssess, loading }) {
  const [target, setTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const awaiting = claims.filter((c) => c.status === 'FORMULATION_TESTING');

  const submit = async (e) => {
    e.preventDefault();
    const ok = await onAssess(target.id, {
      studyTitle: form.studyTitle,
      methodology: form.methodology,
      resultsSummary: form.resultsSummary,
      sampleSize: form.sampleSize ? Number(form.sampleSize) : undefined,
      durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : undefined,
    });
    if (ok) {
      setTarget(null);
      setForm(EMPTY);
    }
  };

  if (!target) {
    return (
      <div className="panel" data-testid="evaluator-panel">
        <h2 className="panel-title">Claims Awaiting Evaluation</h2>
        <p className="panel-hint">Review a submitted claim and attach clinical evidence.</p>
        <div className="await-list" data-testid="awaiting-list">
          {awaiting.length === 0 && (
            <p className="empty-note" data-testid="awaiting-empty">No claims are awaiting evaluation.</p>
          )}
          {awaiting.map((c) => (
            <div className="await-item" key={c.id} data-testid={`awaiting-item-${c.id}`}>
              <div>
                <div className="await-product">{c.productName}</div>
                <div className="await-claim">“{c.claimText}”</div>
              </div>
              <button
                type="button"
                className="ghost-btn"
                data-testid={`evaluate-claim-btn-${c.id}`}
                onClick={() => setTarget(c)}
              >
                Evaluate Claim
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form className="panel assess-form" data-testid="evidence-form" onSubmit={submit}>
      <div className="form-head">
        <h2 className="panel-title">Clinical Study Evidence</h2>
        <button type="button" className="ghost-btn" data-testid="load-evidence-example-btn" onClick={() => setForm(EXAMPLE)}>
          Load example study
        </button>
      </div>

      <ClaimInfoCard claim={target} />

      <fieldset className="fieldset owned">
        <legend>
          Clinical Study Evidence <span className="owner-tag">Evaluator input</span>
        </legend>
        <label>
          Study title
          <input data-testid="study-title-input" required maxLength={300} value={form.studyTitle} onChange={set('studyTitle')} placeholder="e.g. Randomized double-blind study (N=120)" />
        </label>
        <label>
          Methodology
          <textarea data-testid="methodology-input" required maxLength={2000} rows={3} value={form.methodology} onChange={set('methodology')} placeholder="Design, subjects, protocol, measurement instruments…" />
        </label>
        <label>
          Results summary
          <textarea data-testid="results-input" required maxLength={4000} rows={3} value={form.resultsSummary} onChange={set('resultsSummary')} placeholder="Headline results with statistics…" />
        </label>
        <div className="grid-2">
          <label>
            Sample size
            <input data-testid="sample-size-input" type="number" min={1} max={100000} value={form.sampleSize} onChange={set('sampleSize')} placeholder="120" />
          </label>
          <label>
            Duration (weeks)
            <input data-testid="duration-input" type="number" min={1} max={52} value={form.durationWeeks} onChange={set('durationWeeks')} placeholder="4" />
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="submit-btn" data-testid="run-assessment-btn" disabled={loading}>
          {loading ? 'Assessing with AI…' : 'Run AI Assessment'}
        </button>
        <button type="button" className="ghost-btn" data-testid="back-to-list-btn" onClick={() => setTarget(null)} disabled={loading}>
          Back to list
        </button>
      </div>
    </form>
  );
}
