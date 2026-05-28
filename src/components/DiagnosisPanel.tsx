import type { Diagnosis } from '../types';

interface DiagnosisPanelProps {
  diagnosis: Diagnosis;
}

export function DiagnosisPanel({ diagnosis }: DiagnosisPanelProps) {
  return (
    <section className="panel diagnosis-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Debug Diagnosis</p>
          <h2>{diagnosis.failureCase}</h2>
        </div>
        <span className={`severity severity-${diagnosis.severity.toLowerCase()}`}>Severity: {diagnosis.severity}</span>
      </div>
      <div className="diagnosis-grid">
        <Info label="Likely root cause" value={diagnosis.likelyRootCause} />
        <Info label="User impact" value={diagnosis.userImpact} />
        <Info label="Recovery strategy used" value={diagnosis.recoveryStrategy} />
        <Info label="Confidence impact" value={diagnosis.confidenceImpact} />
      </div>
      <div className="recommendation-block">
        <h3>Recommended operator actions</h3>
        <ul>
          {diagnosis.recommendedOperatorActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}
