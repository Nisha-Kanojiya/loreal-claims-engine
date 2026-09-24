export default function AssessmentResult({ loading, claim, assessment }) {
  if (loading) {
    return (
      <div className="panel result loading" data-testid="assessment-loading">
        <div className="loading-pulse">
          <span />
          <span />
          <span />
        </div>
        <p>AI is weighing the study against the claim…</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="panel result empty" data-testid="assessment-empty">
        <p className="empty-note">
          {claim
            ? 'No assessment recorded for this claim yet.'
            : 'Run an assessment — or select a claim from the pipeline — to see the verdict here.'}
        </p>
      </div>
    );
  }

  const pct = Math.round(assessment.confidence * 100);

  return (
    <div className="panel result" data-testid="assessment-result">
      <div className={`verdict-banner ${assessment.justified ? 'ok' : 'ko'}`}>
        <span className="verdict-word" data-testid="verdict-badge">{assessment.justified ? 'Justified' : 'Not Justified'}</span>
        <span className="verdict-sub">
          {assessment.justified ? 'The study substantiates the claim' : 'The study does not substantiate the claim'}
        </span>
      </div>

      <div className="confidence-block">
        <div className="confidence-head">
          <span>Confidence</span>
          <span className="confidence-value" data-testid="confidence-score">{pct}%</span>
        </div>
        <div className="confidence-track">
          <div className="confidence-fill" data-testid="confidence-bar" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="reasoning-block">
        <h3>Reasoning</h3>
        <p data-testid="reasoning-text">{assessment.reasoning}</p>
      </div>

      <dl className="meta-grid" data-testid="assessment-meta">
        <div>
          <dt>Study</dt>
          <dd>{assessment.studyTitle}</dd>
        </div>
        {claim && (
          <div>
            <dt>Product</dt>
            <dd>{claim.productName}</dd>
          </div>
        )}
        {assessment.sampleSize != null && (
          <div>
            <dt>Sample</dt>
            <dd>N={assessment.sampleSize}</dd>
          </div>
        )}
        {assessment.durationWeeks != null && (
          <div>
            <dt>Duration</dt>
            <dd>{assessment.durationWeeks} weeks</dd>
          </div>
        )}
        <div>
          <dt>Model</dt>
          <dd>{assessment.model}</dd>
        </div>
        <div>
          <dt>Assessed</dt>
          <dd>{new Date(assessment.createdAt).toLocaleString()}</dd>
        </div>
      </dl>
    </div>
  );
}
