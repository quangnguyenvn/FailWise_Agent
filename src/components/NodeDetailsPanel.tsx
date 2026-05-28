import { statusLabel } from '../graphConfig';
import type { NodeDetail } from '../types';

interface NodeDetailsPanelProps {
  detail: NodeDetail;
}

export function NodeDetailsPanel({ detail }: NodeDetailsPanelProps) {
  return (
    <aside className="panel detail-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Selected Node</p>
          <h2>{detail.name}</h2>
        </div>
        <span className={`status-pill ${detail.status}`}>Status: {statusLabel[detail.status]}</span>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Purpose</dt>
          <dd>{detail.purpose}</dd>
        </div>
        <div>
          <dt>Input summary</dt>
          <dd>{detail.inputSummary}</dd>
        </div>
        <div>
          <dt>Output summary</dt>
          <dd>{detail.outputSummary}</dd>
        </div>
        <div>
          <dt>Latency</dt>
          <dd>{detail.latencyMs} ms</dd>
        </div>
        {detail.errorMessage && (
          <div>
            <dt>Error message</dt>
            <dd className="error-text">{detail.errorMessage}</dd>
          </div>
        )}
        {detail.detectedFailureCase && (
          <div>
            <dt>Detected failure case</dt>
            <dd>{detail.detectedFailureCase}</dd>
          </div>
        )}
        {detail.diagnosis && (
          <div>
            <dt>Diagnosis</dt>
            <dd>{detail.diagnosis}</dd>
          </div>
        )}
        {detail.recoveryAction && (
          <div>
            <dt>Recovery action</dt>
            <dd>{detail.recoveryAction}</dd>
          </div>
        )}
        {detail.confidenceImpact && (
          <div>
            <dt>Confidence impact</dt>
            <dd>{detail.confidenceImpact}</dd>
          </div>
        )}
      </dl>

      {detail.recommendedOperatorActions && (
        <div className="recommendation-block">
          <h3>Recommended operator actions</h3>
          <ul>
            {detail.recommendedOperatorActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
