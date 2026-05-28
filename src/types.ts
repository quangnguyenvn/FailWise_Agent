export type FailureMode =
  | 'none'
  | 'mcp_timeout'
  | 'mcp_server_error'
  | 'empty_retrieval'
  | 'corrupted_tool_response'
  | 'llm_provider_failure'
  | 'cache_miss'
  | 'partial_evidence';

export type NodeStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'warning'
  | 'failed'
  | 'recovered'
  | 'skipped';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';
export type Confidence = 'High' | 'Medium' | 'Low' | 'Cannot answer safely';

export type FailureCase =
  | 'NO_FAILURE'
  | 'MCP_TIMEOUT'
  | 'MCP_SERVER_ERROR'
  | 'EMPTY_RETRIEVAL'
  | 'TOOL_SCHEMA_VIOLATION'
  | 'LLM_PROVIDER_FAILURE'
  | 'CACHE_MISS'
  | 'PARTIAL_EVIDENCE'
  | 'UNKNOWN_FAILURE';

export type GraphNodeId =
  | 'user-task'
  | 'planner'
  | 'mcp-tool'
  | 'llm-gateway'
  | 'diagnoser'
  | 'recovery-policy'
  | 'cache-fallback'
  | 'rule-fallback'
  | 'final-answer'
  | 'safe-refusal';

export interface NodeDetail {
  id: GraphNodeId;
  name: string;
  status: NodeStatus;
  shortDescription: string;
  purpose: string;
  inputSummary: string;
  outputSummary: string;
  latencyMs: number;
  errorMessage?: string;
  detectedFailureCase?: FailureCase;
  diagnosis?: string;
  recoveryAction?: string;
  confidenceImpact?: string;
  recommendedOperatorActions?: string[];
}

export interface Diagnosis {
  failureCase: FailureCase;
  severity: Severity;
  likelyRootCause: string;
  userImpact: string;
  recoveryStrategy: string;
  confidenceImpact: string;
  recommendedOperatorActions: string[];
}

export type BackupStatus = 'Available' | 'Stale' | 'Missing' | 'Quarantined' | 'Partial';
export type EvidenceTrust = 'Live' | 'Cached' | 'Partial' | 'Invalid' | 'Missing';
export type MemoryAction = 'Preserve' | 'Restore from cache' | 'Quarantine corrupted response' | 'Refuse' | 'Mark partial';

export interface TrustedContextBackup {
  backupStatus: BackupStatus;
  lastTrustedSnapshot: string;
  evidenceTrust: EvidenceTrust;
  memoryAction: MemoryAction;
  protectedContext: string[];
  whyItMatters: string;
  snapshotDetail: TrustedSnapshotDetail;
}

export interface TrustedSnapshotDetail {
  snapshotId: string;
  capturedAt: string;
  source: string;
  previousUserTask: string;
  validatedEvidence: string[];
  previousAssistantSummary: string;
  excludedContext: string[];
  safeToReuseReason: string;
}

export interface FinalAnswer {
  summary: string;
  nextActions: string[];
  confidence: Confidence;
  safetyNote?: string;
  refusal?: boolean;
}

export interface LogEntry {
  timestamp: string;
  message: string;
}

export interface GraphEdgeState {
  id: string;
  status: NodeStatus;
}

export interface AgentRunResult {
  failureMode: FailureMode;
  task: string;
  nodeDetails: Record<GraphNodeId, NodeDetail>;
  edgeStates: Record<string, GraphEdgeState>;
  finalAnswer: FinalAnswer;
  diagnosis: Diagnosis;
  trustedContextBackup: TrustedContextBackup;
  logs: LogEntry[];
}

export interface FailureModeOption {
  label: string;
  value: FailureMode;
}

export type RunSource = 'simulation' | 'deepseek_live';

export interface DeepSeekProbeResult {
  ok: boolean;
  model: string;
  latencyMs: number;
  content?: string;
  errorMessage?: string;
  statusCode?: number;
  failureCase?: FailureCase;
}
