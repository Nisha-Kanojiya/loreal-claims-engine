const STAGES = ['PROPOSED', 'SCREENED', 'FORMULATION_TESTING', 'UNDER_EVALUATION', 'ASSESSED'];

const STAGE_LABELS = {
  PROPOSED: 'Proposed',
  SCREENED: 'Screened',
  FORMULATION_TESTING: 'Formulation',
  UNDER_EVALUATION: 'Evaluation',
  ASSESSED: 'Assessed',
};

const TYPE_LABELS = {
  ANTI_AGING: 'Anti-aging',
  HYDRATION: 'Hydration',
  BRIGHTENING: 'Brightening',
  UV_PROTECTION: 'UV protection',
  HAIR_REPAIR: 'Hair repair',
  SENSITIVE_SKIN: 'Sensitive skin',
};

function StageDots({ status }) {
  const active = STAGES.indexOf(status);
  return (
    <div className="stage-dots" title={STAGE_LABELS[status]}>
      {STAGES.map((s, i) => (
        <span key={s} className={`dot ${i <= active ? 'on' : ''} ${i === active ? 'current' : ''}`} />
      ))}
      <span className="stage-label">{STAGE_LABELS[status]}</span>
    </div>
  );
}

export default function ClaimsPipeline({ claims, selectedId, onSelect }) {
  return (
    <div className="panel pipeline" data-testid="claims-pipeline">
      <h2 className="panel-title">Claims Pipeline</h2>
      <p className="panel-hint">Business → Claim Manager → Scientist → Evaluator</p>
      <div className="claims-list" data-testid="claims-list">
        {claims.length === 0 && <p className="empty-note">No claims yet. Submit the first one.</p>}
        {claims.map((c) => {
          const latest = c.assessments?.[0];
          return (
            <button
              type="button"
              key={c.id}
              data-testid={`claim-item-${c.id}`}
              className={`claim-item ${selectedId === c.id ? 'selected' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <div className="claim-item-top">
                <span className="claim-product">{c.productName}</span>
                <span className="claim-type">{TYPE_LABELS[c.claimType] ?? c.claimType}</span>
              </div>
              <p className="claim-text">“{c.claimText}”</p>
              <div className="claim-item-bottom">
                <StageDots status={c.status} />
                {latest && (
                  <span
                    className={`verdict-chip ${latest.justified ? 'ok' : 'ko'}`}
                    data-testid={`verdict-chip-${c.id}`}
                  >
                    {latest.justified ? 'Justified' : 'Not justified'} · {Math.round(latest.confidence * 100)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
