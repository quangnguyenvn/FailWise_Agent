import type { FinalAnswer } from '../types';

interface FinalAnswerPanelProps {
  answer: FinalAnswer;
}

export function FinalAnswerPanel({ answer }: FinalAnswerPanelProps) {
  const confidenceClass = answer.confidence.toLowerCase().replace(/\s+/g, '-');

  return (
    <section className={`panel final-panel ${answer.refusal ? 'refusal' : ''}`}>
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Final Answer</p>
          <h2>{answer.refusal ? 'Safe refusal activated' : 'Incident response summary'}</h2>
        </div>
        <span className={`confidence confidence-${confidenceClass}`}>Confidence: {answer.confidence}</span>
      </div>
      <p className="answer-summary">{answer.summary}</p>
      <h3>Suggested next actions</h3>
      <ul className="action-list">
        {answer.nextActions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
      {answer.safetyNote && <p className="safety-note">{answer.safetyNote}</p>}
    </section>
  );
}
