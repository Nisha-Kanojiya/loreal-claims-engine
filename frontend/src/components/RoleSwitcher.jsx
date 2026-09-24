export default function RoleSwitcher({ role, onChange }) {
  return (
    <div className="role-switcher" data-testid="role-switcher" role="tablist" aria-label="Persona">
      <button
        type="button"
        role="tab"
        aria-selected={role === 'scientist'}
        data-testid="role-scientist-btn"
        className={`role-btn ${role === 'scientist' ? 'active' : ''}`}
        onClick={() => onChange('scientist')}
      >
        R&amp;I Scientist
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={role === 'evaluator'}
        data-testid="role-evaluator-btn"
        className={`role-btn ${role === 'evaluator' ? 'active' : ''}`}
        onClick={() => onChange('evaluator')}
      >
        Claims Evaluator
      </button>
    </div>
  );
}
