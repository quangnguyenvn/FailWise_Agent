import { Handle, Position, type NodeProps } from 'reactflow';
import { statusLabel } from '../graphConfig';
import type { FailureCase, NodeStatus } from '../types';

interface AgentNodeData {
  label: string;
  status: NodeStatus;
  description: string;
  latencyMs: number;
  failureCase?: FailureCase;
  errorMessage?: string;
}

export function AgentNode({ data, selected }: NodeProps<AgentNodeData>) {
  const showFailureBadge = data.failureCase && data.failureCase !== 'NO_FAILURE';

  return (
    <div className={`agent-node-card status-${data.status} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      {selected && (
        <div className="current-step-marker" aria-label="Current selected step">
          <span />
          Current step
        </div>
      )}
      <div className="agent-node-topline">
        <span className={`node-status-dot ${data.status}`} />
        <span className="node-status-text">{statusLabel[data.status]}</span>
        <span className="node-latency">{data.latencyMs} ms</span>
      </div>
      <strong>{data.label}</strong>
      <p>{data.description}</p>
      {showFailureBadge && <span className="failure-badge">{data.failureCase}</span>}
      {!showFailureBadge && data.errorMessage && <span className="failure-badge">ERROR</span>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
