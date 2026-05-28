import { useState } from 'react';
import type { LogEntry } from '../types';

interface FullLogPanelProps {
  logs: LogEntry[];
}

export function FullLogPanel({ logs }: FullLogPanelProps) {
  const [open, setOpen] = useState(true);
  const diagnosisLine = logs.find((entry) => entry.message.startsWith('Diagnosis:'));
  const recoveryLine = logs.find((entry) => entry.message.startsWith('Recovery:'));
  const confidenceLine = logs.find((entry) => entry.message.includes('Confidence'));

  return (
    <section className="panel log-panel">
      <div className="log-panel-header">
        <div>
          <p className="eyebrow">Full Run Log</p>
          <h2>Timestamped execution trail</h2>
          <p>
            Shows the ordered runtime events behind the graph: tool calls, detected failure, recovery policy, and
            confidence changes.
          </p>
        </div>
        <button className="log-toggle" type="button" onClick={() => setOpen((value) => !value)}>
          <span>{open ? 'Hide log' : 'View log'}</span>
          <span aria-hidden>{open ? '-' : '+'}</span>
        </button>
      </div>

      <div className="log-summary-strip" aria-label="Run log summary">
        <LogSummary label="Events" value={`${logs.length}`} />
        <LogSummary label="Diagnosis" value={diagnosisLine?.message.replace('Diagnosis: ', '') ?? 'No failure'} />
        <LogSummary label="Recovery" value={recoveryLine?.message.replace('Recovery: ', '') ?? 'Normal path'} />
        <LogSummary label="Confidence" value={confidenceLine?.message ?? 'No confidence downgrade'} />
      </div>

      {open && (
        <div className="log-lines">
          {logs.map((entry) => (
            <code key={`${entry.timestamp}-${entry.message}`}>
              [{entry.timestamp}] {entry.message}
            </code>
          ))}
        </div>
      )}
    </section>
  );
}

function LogSummary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
