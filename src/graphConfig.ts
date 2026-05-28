import type { Edge, Node } from 'reactflow';
import type { GraphNodeId, NodeDetail, NodeStatus } from './types';

export const graphNodeOrder: GraphNodeId[] = [
  'user-task',
  'planner',
  'mcp-tool',
  'llm-gateway',
  'diagnoser',
  'recovery-policy',
  'cache-fallback',
  'rule-fallback',
  'final-answer',
  'safe-refusal',
];

export const graphNodeLabels: Record<GraphNodeId, string> = {
  'user-task': 'User Task',
  planner: 'Agent Planner',
  'mcp-tool': 'MCP Tool Call',
  'llm-gateway': 'LLM Gateway',
  diagnoser: 'Failure Diagnoser',
  'recovery-policy': 'Recovery Policy',
  'cache-fallback': 'Cache Fallback',
  'rule-fallback': 'Rule-Based Fallback',
  'final-answer': 'Final Answer',
  'safe-refusal': 'Safe Refusal',
};

export const baseNodePositions: Record<GraphNodeId, { x: number; y: number }> = {
  'user-task': { x: 0, y: 190 },
  planner: { x: 270, y: 190 },
  'mcp-tool': { x: 540, y: 70 },
  'llm-gateway': { x: 540, y: 310 },
  diagnoser: { x: 825, y: 70 },
  'recovery-policy': { x: 1110, y: 70 },
  'cache-fallback': { x: 1110, y: 250 },
  'rule-fallback': { x: 1110, y: 430 },
  'final-answer': { x: 1400, y: 230 },
  'safe-refusal': { x: 1400, y: 430 },
};

export const baseEdges: Edge[] = [
  { id: 'task-planner', source: 'user-task', target: 'planner' },
  { id: 'planner-mcp', source: 'planner', target: 'mcp-tool' },
  { id: 'mcp-llm', source: 'mcp-tool', target: 'llm-gateway' },
  { id: 'llm-final', source: 'llm-gateway', target: 'final-answer' },
  { id: 'mcp-diagnoser', source: 'mcp-tool', target: 'diagnoser' },
  { id: 'llm-diagnoser', source: 'llm-gateway', target: 'diagnoser' },
  { id: 'diagnoser-policy', source: 'diagnoser', target: 'recovery-policy' },
  { id: 'policy-cache', source: 'recovery-policy', target: 'cache-fallback' },
  { id: 'policy-rule', source: 'recovery-policy', target: 'rule-fallback' },
  { id: 'cache-final', source: 'cache-fallback', target: 'final-answer' },
  { id: 'rule-final', source: 'rule-fallback', target: 'final-answer' },
  { id: 'cache-refusal', source: 'cache-fallback', target: 'safe-refusal' },
];

export const statusLabel: Record<NodeStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  success: 'Success',
  warning: 'Warning',
  failed: 'Failed',
  recovered: 'Recovered',
  skipped: 'Skipped',
};

export const statusTone: Record<NodeStatus, string> = {
  idle: '#64748b',
  running: '#38bdf8',
  success: '#22c55e',
  warning: '#f59e0b',
  failed: '#ef4444',
  recovered: '#8b5cf6',
  skipped: '#475569',
};

export function buildNodes(details: Record<GraphNodeId, NodeDetail>): Node[] {
  return graphNodeOrder.map((id) => {
    const detail = details[id];

    return {
      id,
      position: baseNodePositions[id],
      data: {
        label: graphNodeLabels[id],
        status: detail.status,
        description: detail.shortDescription,
        latencyMs: detail.latencyMs,
        failureCase: detail.detectedFailureCase,
        errorMessage: detail.errorMessage,
      },
      type: 'agentNode',
      className: `flow-node node-${detail.status}`,
    };
  });
}

export function buildEdges(edgeStatuses: Record<string, { status: NodeStatus }>): Edge[] {
  return baseEdges.map((edge) => {
    const status = edgeStatuses[edge.id]?.status ?? 'idle';

    return {
      ...edge,
      animated: status === 'running' || status === 'recovered' || status === 'warning',
      className: `flow-edge edge-${status}`,
      label: status === 'idle' ? undefined : statusLabel[status],
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
      style: {
        stroke: statusTone[status],
        strokeWidth: status === 'idle' || status === 'skipped' ? 1.5 : 2.5,
      },
    };
  });
}
