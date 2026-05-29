import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { TrustedContextBackup } from '../types';

interface TrustedContextPanelProps {
  backup: TrustedContextBackup;
}

export function TrustedContextPanel({ backup }: TrustedContextPanelProps) {
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const statusClass = backup.backupStatus.toLowerCase().replace(/\s+/g, '-');
  const trustClass = backup.evidenceTrust.toLowerCase().replace(/\s+/g, '-');
  const snapshot = backup.snapshotDetail;

  useEffect(() => {
    document.body.classList.toggle('snapshot-modal-open', isSnapshotOpen);

    return () => {
      document.body.classList.remove('snapshot-modal-open');
    };
  }, [isSnapshotOpen]);

  return (
    <>
      <section className="panel trusted-context-panel">
        <div className="panel-header compact">
          <div>
            <p className="eyebrow">Trusted Context Backup</p>
            <h2>Memory safety state</h2>
          </div>
          <span className={`backup-pill backup-${statusClass}`}>{backup.backupStatus}</span>
        </div>

        <div className="context-grid">
          <Info label="Last trusted snapshot" value={backup.lastTrustedSnapshot} />
          <div>
            <span>Evidence trust</span>
            <p>
              <b className={`trust-chip trust-${trustClass}`}>{backup.evidenceTrust}</b>
            </p>
          </div>
          <Info label="Memory action" value={backup.memoryAction} />
          <Info label="Why it matters" value={backup.whyItMatters} />
        </div>

        <div className="snapshot-action">
          <button className="snapshot-link" type="button" onClick={() => setIsSnapshotOpen(true)}>
            View trusted snapshot
          </button>
          <span>{snapshot.snapshotId}</span>
        </div>

        <div className="recommendation-block">
          <h3>Protected context</h3>
          <ul>
            {backup.protectedContext.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {isSnapshotOpen &&
        createPortal(
        <div className="modal-backdrop" role="presentation" onClick={() => setIsSnapshotOpen(false)}>
          <section
            className="snapshot-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="snapshot-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="snapshot-modal-header">
              <div>
                <p className="eyebrow">Context Snapshot</p>
                <h2 id="snapshot-title">Last trusted agent memory</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setIsSnapshotOpen(false)}>
                Close
              </button>
            </div>

            <div className="snapshot-meta-grid">
              <Info label="Snapshot ID" value={snapshot.snapshotId} />
              <Info label="Captured at" value={snapshot.capturedAt} />
              <Info label="Source" value={snapshot.source} />
              <div>
                <span>Trust state</span>
                <p>
                  <b className={`trust-chip trust-${trustClass}`}>{backup.evidenceTrust}</b>
                </p>
              </div>
            </div>

            <SnapshotSection title="Previous user task">
              <p>{snapshot.previousUserTask}</p>
            </SnapshotSection>

            <SnapshotSection title="Validated evidence">
              <ul>
                {snapshot.validatedEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SnapshotSection>

            <SnapshotSection title="Previous assistant summary">
              <p>{snapshot.previousAssistantSummary}</p>
            </SnapshotSection>

            <SnapshotSection title="Excluded or quarantined context">
              <ul>
                {snapshot.excludedContext.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </SnapshotSection>

            <SnapshotSection title="Why it is safe to reuse">
              <p>{snapshot.safeToReuseReason}</p>
            </SnapshotSection>
          </section>
        </div>,
        document.body,
      )}
    </>
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

function SnapshotSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="snapshot-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
