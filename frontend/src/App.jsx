import { useCallback, useEffect, useState } from 'react';
import { assessClaim, createClaim, fetchClaim, fetchClaims } from './api';
import RoleSwitcher from './components/RoleSwitcher';
import ClaimsPipeline from './components/ClaimsPipeline';
import ClaimForm from './components/ClaimForm';
import EvaluatorPanel from './components/EvaluatorPanel';
import AssessmentResult from './components/AssessmentResult';

export default function App() {
  const [role, setRole] = useState('scientist');
  const [claims, setClaims] = useState([]);
  const [selection, setSelection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setClaims(await fetchClaims());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Scientist step: create claim only (FORMULATION_TESTING). No LLM call.
  const handleCreateClaim = async (payload) => {
    setError(null);
    try {
      await createClaim({ ...payload, submittedBy: 'R&I Scientist (Paris)' });
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  // Evaluator step: attach evidence to an existing claim, run the AI assessment.
  const handleAssess = async (claimId, evidence) => {
    setLoading(true);
    setError(null);
    try {
      const result = await assessClaim(claimId, evidence);
      setSelection({ claim: result.claim, assessment: result.assessment });
      await refresh();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClaim = async (id) => {
    setError(null);
    try {
      const claim = await fetchClaim(id);
      setSelection({ claim, assessment: claim.assessments?.[0] ?? null });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="app" data-testid="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">L'ORÉAL</span>
          <span className="brand-sub">Research &amp; Innovation · Paris</span>
        </div>
        <RoleSwitcher role={role} onChange={setRole} />
      </header>

      <section className="hero">
        <h1 className="hero-title">Claims Intelligence Engine</h1>
        <p className="hero-sub">
          {role === 'scientist'
            ? 'Create and submit the claim — clinical evaluation happens later, by an evaluator.'
            : 'Review a submitted claim and attach clinical evidence — the AI verdict is advisory.'}
        </p>
      </section>

      <main className="layout">
        <aside className="pipeline-col">
          <ClaimsPipeline claims={claims} selectedId={selection?.claim?.id} onSelect={handleSelectClaim} />
        </aside>
        <section className="work-col">
          {role === 'scientist' ? (
            <ClaimForm onSubmit={handleCreateClaim} />
          ) : (
            <EvaluatorPanel claims={claims} onAssess={handleAssess} loading={loading} />
          )}
          {error && (
            <div className="error-alert" data-testid="error-alert" role="alert">
              {error}
            </div>
          )}
          <AssessmentResult loading={loading} claim={selection?.claim} assessment={selection?.assessment} />
        </section>
      </main>

      <footer className="footer">
        <span>EU 1223/2009 common criteria · LLM verdicts are advisory and require evaluator sign-off</span>
      </footer>
    </div>
  );
}
