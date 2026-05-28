import type {
  AgentRunResult,
  Diagnosis,
  FailureCase,
  FailureMode,
  FailureModeOption,
  FinalAnswer,
  GraphEdgeState,
  GraphNodeId,
  LogEntry,
  NodeDetail,
  NodeStatus,
  DeepSeekProbeResult,
  TrustedContextBackup,
  TrustedSnapshotDetail,
} from './types';

export const defaultTask =
  'Investigate why checkout errors increased in the last hour and suggest next actions.';

export const failureModeOptions: FailureModeOption[] = [
  { label: 'None', value: 'none' },
  { label: 'MCP timeout', value: 'mcp_timeout' },
  { label: 'MCP server error', value: 'mcp_server_error' },
  { label: 'Empty retrieval', value: 'empty_retrieval' },
  { label: 'Corrupted tool response', value: 'corrupted_tool_response' },
  { label: 'LLM provider failure', value: 'llm_provider_failure' },
  { label: 'Cache miss / no cache available', value: 'cache_miss' },
  { label: 'Partial evidence', value: 'partial_evidence' },
];

const evidence = [
  'Error rate increased from 1.2% to 8.7%.',
  'Payment gateway timeout rate increased.',
  'Recent deployment touched checkout retry logic.',
  'Database latency is normal.',
  'Third-party payment provider has elevated latency.',
  'Cache hit rate dropped slightly.',
];

function trustedSnapshot(overrides: Partial<TrustedSnapshotDetail> = {}): TrustedSnapshotDetail {
  return {
    snapshotId: 'ctx_checkout_124058_live',
    capturedAt: '12:40:58',
    source: 'Live MCP evidence and successful LLM synthesis',
    previousUserTask: defaultTask,
    validatedEvidence: evidence,
    previousAssistantSummary:
      'Checkout errors increased sharply. The strongest likely causes were payment gateway latency and the recent checkout retry-logic deployment, with database latency still normal.',
    excludedContext: ['None. All context passed schema and freshness validation.'],
    safeToReuseReason:
      'The snapshot was captured from schema-valid evidence and a completed high-confidence run, so it can be reused as a bounded fallback if live context fails.',
    ...overrides,
  };
}

const purposeByNode: Record<GraphNodeId, string> = {
  'user-task': 'Captures the operator request and incident scope.',
  planner: 'Breaks the task into tool calls, evidence checks, and response criteria.',
  'mcp-tool': 'Fetches incident context from observability and deployment tools through MCP.',
  'llm-gateway': 'Synthesizes evidence into a response using the primary LLM provider.',
  diagnoser: 'Classifies failures and estimates severity, blast radius, and trust impact.',
  'recovery-policy': 'Selects the safest recovery path based on failure type and available evidence.',
  'cache-fallback': 'Uses previously trusted incident context when live tools are unavailable.',
  'rule-fallback': 'Generates constrained guidance from deterministic incident-response rules.',
  'final-answer': 'Returns a user-facing answer with confidence and safety notes.',
  'safe-refusal': 'Stops the agent from inventing facts when trusted context is unavailable.',
};

const shortDescriptionByNode: Record<GraphNodeId, string> = {
  'user-task': 'Incident request',
  planner: 'Plan tools and evidence',
  'mcp-tool': 'Fetch live context',
  'llm-gateway': 'Synthesize with LLM',
  diagnoser: 'Classify failure',
  'recovery-policy': 'Choose safe path',
  'cache-fallback': 'Use trusted cache',
  'rule-fallback': 'Deterministic fallback',
  'final-answer': 'Answer with confidence',
  'safe-refusal': 'Block speculation',
};

const baseOutputs: Record<GraphNodeId, string> = {
  'user-task': 'Incident task accepted for checkout reliability triage.',
  planner: 'Plan: gather metrics, inspect deployment changes, compare provider latency, then recommend actions.',
  'mcp-tool': evidence.join(' '),
  'llm-gateway': 'Synthesized incident narrative from tool evidence.',
  diagnoser: 'No infrastructure failure detected.',
  'recovery-policy': 'Normal execution path selected.',
  'cache-fallback': 'Not needed for this run.',
    'rule-fallback': 'Not needed for this run.',
  'final-answer': 'Checkout failures likely correlate with payment provider latency and retry logic changes.',
  'safe-refusal': 'Not needed because trusted context is available.',
};

const baseLatencies: Record<GraphNodeId, number> = {
  'user-task': 28,
  planner: 142,
  'mcp-tool': 870,
  'llm-gateway': 1180,
  diagnoser: 95,
  'recovery-policy': 70,
  'cache-fallback': 45,
  'rule-fallback': 55,
  'final-answer': 210,
  'safe-refusal': 35,
};

const allNodeIds = Object.keys(purposeByNode) as GraphNodeId[];

function createDetails(task: string, statuses: Partial<Record<GraphNodeId, NodeStatus>>): Record<GraphNodeId, NodeDetail> {
  return allNodeIds.reduce(
    (acc, id) => {
      acc[id] = {
        id,
        name: labelFor(id),
        status: statuses[id] ?? 'idle',
        shortDescription: shortDescriptionByNode[id],
        purpose: purposeByNode[id],
        inputSummary: inputFor(id, task),
        outputSummary: baseOutputs[id],
        latencyMs: baseLatencies[id],
      };
      return acc;
    },
    {} as Record<GraphNodeId, NodeDetail>,
  );
}

function labelFor(id: GraphNodeId): string {
  return {
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
  }[id];
}

function inputFor(id: GraphNodeId, task: string): string {
  const inputs: Record<GraphNodeId, string> = {
    'user-task': task,
    planner: 'Operator task and incident-response policy.',
    'mcp-tool': 'Planned call: incident_context(checkout, last_60m).',
    'llm-gateway': 'Tool evidence, policy constraints, and response format.',
    diagnoser: 'Observed tool/provider status and partial execution trace.',
    'recovery-policy': 'Failure classification, severity, and trust boundaries.',
    'cache-fallback': 'Last trusted checkout incident snapshot and freshness metadata.',
    'rule-fallback': 'Static runbook rules for degraded incident triage.',
    'final-answer': 'Available trusted evidence and confidence policy.',
    'safe-refusal': 'Unavailable or untrusted context plus anti-hallucination policy.',
  };

  return inputs[id];
}

function edgeStates(active: Record<string, NodeStatus>): Record<string, GraphEdgeState> {
  const ids = [
    'task-planner',
    'planner-mcp',
    'mcp-llm',
    'llm-final',
    'mcp-diagnoser',
    'llm-diagnoser',
    'diagnoser-policy',
    'policy-cache',
    'policy-rule',
    'cache-final',
    'rule-final',
    'cache-refusal',
  ];

  return ids.reduce(
    (acc, id) => {
      acc[id] = { id, status: active[id] ?? 'idle' };
      return acc;
    },
    {} as Record<string, GraphEdgeState>,
  );
}

function finalAnswer(confidence: 'High' | 'Medium' | 'Low', safetyNote?: string): FinalAnswer {
  return {
    summary:
      'Checkout errors rose from 1.2% to 8.7% in the last hour. The strongest signal is increased payment gateway timeouts after a checkout retry-logic deployment, while database latency remains normal.',
    nextActions: [
      'Roll back or feature-flag the checkout retry change while preserving telemetry.',
      'Contact the payment provider and compare affected regions, merchants, and request paths.',
      'Raise checkout timeout alerts and watch conversion, retry volume, and duplicate-charge indicators.',
      'Prepare a customer-support note for failed payment attempts if the error rate stays above 5%.',
    ],
    confidence,
    safetyNote,
  };
}

const healthyDiagnosis: Diagnosis = {
  failureCase: 'NO_FAILURE',
  severity: 'Low',
  likelyRootCause: 'No agent infrastructure failure. Live evidence was available and internally consistent.',
  userImpact: 'The operator receives a complete incident summary with high confidence.',
  recoveryStrategy: 'Normal execution path.',
  confidenceImpact: 'None. Confidence remains High.',
  recommendedOperatorActions: [
    'Continue monitoring payment gateway latency and checkout error budgets.',
    'Record this run as a baseline trace for future chaos tests.',
  ],
};

const healthyBackup: TrustedContextBackup = {
  backupStatus: 'Available',
  lastTrustedSnapshot: 'checkout-context @ 12:40:58',
  evidenceTrust: 'Live',
  memoryAction: 'Preserve',
  protectedContext: [
    'User task and incident scope',
    'Validated MCP evidence: checkout metrics, deployment diff, provider latency',
    'Final response trace and confidence decision',
  ],
  whyItMatters: 'The agent can preserve a clean trusted context snapshot for future fallback without using stale or invalid data.',
  snapshotDetail: trustedSnapshot(),
};

const backupByFailure: Record<FailureCase, TrustedContextBackup> = {
  NO_FAILURE: healthyBackup,
  MCP_TIMEOUT: {
    backupStatus: 'Stale',
    lastTrustedSnapshot: 'checkout-context @ 12:32:09',
    evidenceTrust: 'Cached',
    memoryAction: 'Restore from cache',
    protectedContext: [
      'Operator task preserved',
      'Timed-out MCP response excluded from working memory',
      'Last trusted checkout evidence restored with freshness warning',
    ],
    whyItMatters:
      'The agent keeps working from a known-good snapshot while clearly downgrading confidence because live context is unavailable.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'ctx_checkout_123209_cache',
      capturedAt: '12:32:09',
      source: 'Trusted cache snapshot restored after MCP timeout',
      previousAssistantSummary:
        'The last trusted run saw checkout errors rising with payment-provider latency and a retry-logic deployment as the main suspects.',
      excludedContext: [
        'Timed-out incident_context response after 3000ms.',
        'Retry result was not injected into synthesis memory.',
      ],
      safeToReuseReason:
        'The cached context is slightly stale but schema-valid, so FailWise can answer with a confidence downgrade and a freshness warning.',
    }),
  },
  MCP_SERVER_ERROR: {
    backupStatus: 'Stale',
    lastTrustedSnapshot: 'checkout-context @ 12:31:44',
    evidenceTrust: 'Cached',
    memoryAction: 'Restore from cache',
    protectedContext: [
      'MCP 500 trace retained for operators',
      'Failed live response kept out of synthesis memory',
      'Recent trusted checkout snapshot restored',
    ],
    whyItMatters:
      'The agent avoids amplifying a broken MCP server while still providing bounded guidance from trusted cached evidence.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'ctx_checkout_123144_cache',
      capturedAt: '12:31:44',
      source: 'Trusted cache snapshot restored after MCP server error',
      previousAssistantSummary:
        'Checkout failures were most consistent with payment gateway latency and a recent checkout retry change; database latency was not elevated.',
      excludedContext: [
        'HTTP 500 response body from incident_context.',
        'Upstream connector error details kept in debug logs only.',
      ],
      safeToReuseReason:
        'The failed server response is not trusted, but the earlier validated checkout snapshot is usable for bounded remediation advice.',
    }),
  },
  EMPTY_RETRIEVAL: {
    backupStatus: 'Available',
    lastTrustedSnapshot: 'checkout-runbook @ 12:30:18',
    evidenceTrust: 'Partial',
    memoryAction: 'Restore from cache',
    protectedContext: [
      'Live metrics preserved',
      'Empty retrieval result tagged as a retrieval gap',
      'Cached checkout runbook restored for next actions',
    ],
    whyItMatters:
      'An empty retrieval is not treated as proof that nothing happened; the agent marks the context gap and uses trusted runbook backup.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'runbook_checkout_123018_cache',
      capturedAt: '12:30:18',
      source: 'Cached checkout runbook plus live metrics',
      validatedEvidence: [
        'Live checkout error metrics returned successfully.',
        'Cached checkout incident runbook is within freshness window.',
        'Deployment diff was available for retry-logic review.',
      ],
      previousAssistantSummary:
        'Use checkout runbook steps while verifying why retrieval returned zero incident notes.',
      excludedContext: [
        'Zero retrieved documents were treated as a retrieval gap, not proof that no incident exists.',
      ],
      safeToReuseReason:
        'The runbook snapshot is trusted for next-action guidance, but not enough to claim complete incident history.',
    }),
  },
  TOOL_SCHEMA_VIOLATION: {
    backupStatus: 'Quarantined',
    lastTrustedSnapshot: 'checkout-context @ 12:29:52',
    evidenceTrust: 'Invalid',
    memoryAction: 'Quarantine corrupted response',
    protectedContext: [
      'Malformed MCP payload isolated in debug trace',
      'Invalid fields blocked from final synthesis',
      'Last schema-valid evidence snapshot restored',
    ],
    whyItMatters:
      'The agent does not poison its memory with corrupted tool output, which prevents confident answers from invalid evidence.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'ctx_checkout_122952_schema_valid',
      capturedAt: '12:29:52',
      source: 'Last schema-valid MCP snapshot',
      previousAssistantSummary:
        'Only the last schema-valid checkout evidence was allowed into synthesis after the malformed MCP payload was blocked.',
      excludedContext: [
        'Malformed MCP payload with invalid evidence[2].timestamp.',
        'Any fields that failed schema validation.',
      ],
      safeToReuseReason:
        'The corrupted response is quarantined and the fallback snapshot passed schema validation before being reused.',
    }),
  },
  LLM_PROVIDER_FAILURE: {
    backupStatus: 'Available',
    lastTrustedSnapshot: 'validated-evidence @ 12:41:05',
    evidenceTrust: 'Live',
    memoryAction: 'Preserve',
    protectedContext: [
      'Validated MCP evidence preserved before LLM call',
      'Provider error stored as route metadata',
      'Rule-based fallback receives only trusted evidence',
    ],
    whyItMatters:
      'The provider can fail without losing the agent working context, enabling fallback synthesis without re-fetching tools.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'validated_evidence_124105_pre_llm',
      capturedAt: '12:41:05',
      source: 'Validated MCP evidence preserved before LLM provider failure',
      previousAssistantSummary:
        'Validated evidence was preserved, then a rule-based fallback generated constrained incident guidance after the provider failed.',
      excludedContext: [
        'Provider 503 / failed generation response.',
        'Any incomplete LLM text returned after the provider failure.',
      ],
      safeToReuseReason:
        'The evidence was already validated before the LLM call, so fallback synthesis can proceed without trusting the failed provider response.',
    }),
  },
  CACHE_MISS: {
    backupStatus: 'Missing',
    lastTrustedSnapshot: 'none for checkout:last_60m',
    evidenceTrust: 'Missing',
    memoryAction: 'Refuse',
    protectedContext: [
      'User task preserved',
      'Failed live retrieval recorded',
      'No untrusted fallback injected into memory',
    ],
    whyItMatters:
      'When no trusted backup exists, the safest recovery is refusal rather than inventing operational facts.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'missing_checkout_context',
      capturedAt: 'none',
      source: 'No trusted backup available',
      validatedEvidence: ['Only the current user task and failure trace are preserved.'],
      previousAssistantSummary:
        'No prior trusted checkout context exists for this scope. The agent must refuse rather than invent incident findings.',
      excludedContext: [
        'Failed live MCP retrieval.',
        'Missing cache lookup result for checkout:last_60m.',
        'Speculative remediation steps.',
      ],
      safeToReuseReason:
        'There is no trusted snapshot to reuse, so the only safe action is refusal with operator escalation.',
    }),
  },
  PARTIAL_EVIDENCE: {
    backupStatus: 'Partial',
    lastTrustedSnapshot: 'checkout-context @ 12:38:21',
    evidenceTrust: 'Partial',
    memoryAction: 'Mark partial',
    protectedContext: [
      'Available checkout metrics preserved',
      'Missing provider-status evidence marked explicitly',
      'Confidence policy attached to final answer',
    ],
    whyItMatters:
      'The agent can answer with caveats while preventing partial evidence from being mistaken for complete incident context.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'ctx_checkout_123821_partial',
      capturedAt: '12:38:21',
      source: 'Partial trusted checkout snapshot',
      validatedEvidence: [
        'Checkout error rate and deployment diff are available.',
        'Database latency is normal.',
        'Provider status evidence is incomplete.',
      ],
      previousAssistantSummary:
        'Provider latency is likely but not confirmed; final guidance must include verification steps and lower confidence.',
      excludedContext: ['Missing third-party provider status confirmation.'],
      safeToReuseReason:
        'The snapshot is explicitly marked partial, so it can support a caveated answer without overstating causality.',
    }),
  },
  UNKNOWN_FAILURE: {
    backupStatus: 'Missing',
    lastTrustedSnapshot: 'unknown',
    evidenceTrust: 'Missing',
    memoryAction: 'Refuse',
    protectedContext: ['Unknown failure recorded for operator investigation'],
    whyItMatters: 'Unknown failure states should not be promoted into trusted memory without operator review.',
    snapshotDetail: trustedSnapshot({
      snapshotId: 'unknown_failure_no_snapshot',
      capturedAt: 'unknown',
      source: 'Unknown failure path',
      validatedEvidence: ['Only the failure trace is preserved for operator review.'],
      previousAssistantSummary: 'No safe summary is available for this unknown failure state.',
      excludedContext: ['Unclassified failure artifacts pending operator review.'],
      safeToReuseReason:
        'No agent memory should be reused until the unknown failure is classified and reviewed.',
    }),
  },
};

export function simulateAgentRun(failureMode: FailureMode, task: string): AgentRunResult {
  switch (failureMode) {
    case 'none':
      return healthyRun(task);
    case 'mcp_timeout':
      return mcpTimeoutRun(task);
    case 'mcp_server_error':
      return mcpServerErrorRun(task);
    case 'empty_retrieval':
      return emptyRetrievalRun(task);
    case 'corrupted_tool_response':
      return corruptedToolRun(task);
    case 'llm_provider_failure':
      return llmProviderFailureRun(task);
    case 'cache_miss':
      return cacheMissRun(task);
    case 'partial_evidence':
      return partialEvidenceRun(task);
    default:
      return healthyRun(task);
  }
}

export function simulateDeepSeekLiveRun(task: string, probe: DeepSeekProbeResult): AgentRunResult {
  return probe.ok ? deepSeekLiveSuccessRun(task, probe) : deepSeekLiveFailureRun(task, probe);
}

function healthyRun(task: string): AgentRunResult {
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'success',
    'llm-gateway': 'success',
    'final-answer': 'success',
    diagnoser: 'skipped',
    'recovery-policy': 'skipped',
    'cache-fallback': 'skipped',
    'rule-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  return {
    failureMode: 'none',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'success',
      'mcp-llm': 'success',
      'llm-final': 'success',
    }),
    finalAnswer: finalAnswer('High'),
    diagnosis: healthyDiagnosis,
    trustedContextBackup: healthyBackup,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'MCP returned 6 evidence items',
      'Calling LLM Gateway: primary_provider',
      'Final answer generated with complete context',
    ]),
  };
}

function deepSeekLiveSuccessRun(task: string, probe: DeepSeekProbeResult): AgentRunResult {
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'success',
    'llm-gateway': 'success',
    'final-answer': 'success',
    diagnoser: 'skipped',
    'recovery-policy': 'skipped',
    'cache-fallback': 'skipped',
    'rule-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['llm-gateway'].outputSummary = `DeepSeek ${probe.model} returned a live response.`;
  details['llm-gateway'].latencyMs = probe.latencyMs;
  details['final-answer'].outputSummary = 'Generated from live DeepSeek provider response.';

  return {
    failureMode: 'none',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'success',
      'mcp-llm': 'success',
      'llm-final': 'success',
    }),
    finalAnswer: {
      summary:
        probe.content ??
        'DeepSeek returned successfully. The agent can produce the incident response with live provider context.',
      nextActions: [
        'Use this as the normal provider-success baseline in the judge demo.',
        'Switch to an invalid model or remove the key to show the FailWise fallback path.',
        'Compare the graph states between live provider success and provider failure.',
      ],
      confidence: 'High',
      safetyNote: 'Live DeepSeek provider call completed successfully through the local proxy.',
    },
    diagnosis: {
      ...healthyDiagnosis,
      likelyRootCause: 'No provider failure. The DeepSeek live probe completed successfully.',
      recoveryStrategy: 'Normal DeepSeek provider path.',
      recommendedOperatorActions: [
        'Keep the provider route monitored for latency, 4xx/5xx errors, and timeout rate.',
        'Use this run as the baseline before demonstrating fallback behavior.',
      ],
    },
    trustedContextBackup: {
      ...healthyBackup,
      lastTrustedSnapshot: 'deepseek-live @ 12:41:12',
      snapshotDetail: trustedSnapshot({
        snapshotId: 'deepseek_live_124112',
        capturedAt: '12:41:12',
        source: `Live DeepSeek provider probe: ${probe.model}`,
        previousUserTask: task,
        previousAssistantSummary:
          probe.content ??
          'DeepSeek returned successfully. The agent can preserve this successful provider response as a baseline for fallback demos.',
        excludedContext: ['None. The DeepSeek provider call completed successfully.'],
        safeToReuseReason:
          'The provider response completed through the local proxy and is paired with validated mock incident evidence, so it can be shown as the last trusted live chat context.',
      }),
    },
    logs: log([
      'Starting live DeepSeek provider probe',
      'Planning tool calls',
      'Using mock incident evidence for MCP context',
      `Calling LLM Gateway: DeepSeek ${probe.model}`,
      `DeepSeek response received in ${probe.latencyMs}ms`,
      'Diagnosis: NO_FAILURE, severity=Low',
      'Final answer generated from live provider response',
    ]),
  };
}

function deepSeekLiveFailureRun(task: string, probe: DeepSeekProbeResult): AgentRunResult {
  const failureCase = probe.failureCase ?? 'LLM_PROVIDER_FAILURE';
  const diagnosis: Diagnosis = {
    failureCase,
    severity: failureCase === 'CACHE_MISS' ? 'Critical' : 'High',
    likelyRootCause: probe.errorMessage ?? 'DeepSeek provider call failed or timed out.',
    userImpact: 'The operator can still see a safe degraded answer because mock MCP evidence is available.',
    recoveryStrategy: 'Use deterministic rule-based fallback over validated incident evidence.',
    confidenceImpact: 'Confidence downgraded from High to Medium because live LLM synthesis failed.',
    recommendedOperatorActions: [
      'Verify DEEPSEEK_API_KEY is configured in the local environment.',
      'Check provider status, model name, account balance, and rate limits.',
      'Route production traffic through an AI gateway with timeout and fallback policies.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'success',
    'llm-gateway': 'failed',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'rule-fallback': 'recovered',
    'final-answer': 'warning',
    'cache-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['llm-gateway'].latencyMs = probe.latencyMs;
  details['llm-gateway'].errorMessage = probe.errorMessage ?? 'DeepSeek provider unavailable.';
  details['llm-gateway'].detectedFailureCase = failureCase;
  details.diagnoser.diagnosis = `${failureCase}, severity=${diagnosis.severity}.`;
  details.diagnoser.detectedFailureCase = failureCase;
  details['recovery-policy'].recoveryAction = 'rule_based_fallback';
  details['rule-fallback'].outputSummary =
    'DeepSeek failed, so FailWise used deterministic incident-response guidance over validated mock evidence.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'llm_provider_failure',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'success',
      'mcp-llm': 'failed',
      'llm-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'policy-rule': 'recovered',
      'rule-final': 'warning',
    }),
    finalAnswer: finalAnswer(
      'Medium',
      'Live DeepSeek provider call failed, so FailWise used a deterministic fallback and downgraded confidence.',
    ),
    diagnosis,
    trustedContextBackup: backupByFailure[failureCase],
    logs: log([
      'Starting live DeepSeek provider probe',
      'Planning tool calls',
      'Using mock incident evidence for MCP context',
      `Calling LLM Gateway: DeepSeek ${probe.model}`,
      `LLM_PROVIDER_FAILURE: ${probe.errorMessage ?? 'provider unavailable'}`,
      `Diagnosis: ${failureCase}, severity=${diagnosis.severity}`,
      'Recovery: rule_based_fallback',
      'Confidence downgraded High -> Medium',
      'Final answer generated from deterministic fallback',
    ]),
  };
}

function mcpTimeoutRun(task: string): AgentRunResult {
  const diagnosis: Diagnosis = {
    failureCase: 'MCP_TIMEOUT',
    severity: 'Medium',
    likelyRootCause: 'The incident_context MCP server exceeded the 3000ms timeout during live evidence retrieval.',
    userImpact: 'The answer is useful but based on last trusted cache instead of live telemetry.',
    recoveryStrategy: 'Retry once, classify timeout, then fall back to cached incident context.',
    confidenceImpact: 'Confidence downgraded from High to Medium.',
    recommendedOperatorActions: [
      'Check MCP server saturation, queue depth, and downstream observability API latency.',
      'Increase timeout only after confirming the server is healthy under load.',
      'Keep cached snapshots fresh for critical incident domains.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'failed',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'cache-fallback': 'recovered',
    'final-answer': 'warning',
    'llm-gateway': 'skipped',
    'rule-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['mcp-tool'].errorMessage = 'MCP_TIMEOUT after 3000ms; retry also timed out.';
  details['mcp-tool'].detectedFailureCase = 'MCP_TIMEOUT';
  details.diagnoser.diagnosis = 'MCP_TIMEOUT, severity=Medium.';
  details.diagnoser.detectedFailureCase = 'MCP_TIMEOUT';
  details['recovery-policy'].recoveryAction = 'fallback_to_cache';
  details['cache-fallback'].outputSummary = 'Recovered last trusted checkout incident snapshot from 9 minutes ago.';
  details['final-answer'].outputSummary = 'Generated degraded-context incident summary with confidence downgrade.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'mcp_timeout',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'failed',
      'mcp-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'policy-cache': 'recovered',
      'cache-final': 'warning',
    }),
    finalAnswer: finalAnswer(
      'Medium',
      'Confidence is downgraded because live MCP telemetry timed out and the answer used a recent trusted cache snapshot.',
    ),
    diagnosis,
    trustedContextBackup: backupByFailure.MCP_TIMEOUT,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'MCP_TIMEOUT after 3000ms',
      'Retrying once',
      'Retry failed',
      'Diagnosis: MCP_TIMEOUT, severity=Medium',
      'Recovery: fallback_to_cache',
      'Confidence downgraded High -> Medium',
      'Final answer generated with degraded context',
    ]),
  };
}

function mcpServerErrorRun(task: string): AgentRunResult {
  const diagnosis: Diagnosis = {
    failureCase: 'MCP_SERVER_ERROR',
    severity: 'High',
    likelyRootCause: 'The MCP server returned HTTP 500 while assembling incident context.',
    userImpact: 'Live context is unavailable; the operator receives cache-backed guidance with explicit limitations.',
    recoveryStrategy: 'Avoid repeated calls, use cache fallback, and preserve the error trace for operators.',
    confidenceImpact: 'Confidence downgraded from High to Medium.',
    recommendedOperatorActions: [
      'Inspect MCP server logs for failing upstream connector calls.',
      'Check recent MCP deployment or configuration changes.',
      'Add circuit breaking so repeated agent runs do not amplify the outage.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'failed',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'cache-fallback': 'recovered',
    'final-answer': 'warning',
    'llm-gateway': 'skipped',
    'rule-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['mcp-tool'].errorMessage = 'HTTP 500 from incident_context: upstream connector failed.';
  details['mcp-tool'].detectedFailureCase = 'MCP_SERVER_ERROR';
  details.diagnoser.diagnosis = 'MCP_SERVER_ERROR, severity=High.';
  details.diagnoser.detectedFailureCase = 'MCP_SERVER_ERROR';
  details['recovery-policy'].recoveryAction = 'fallback_to_cache_and_open_circuit';
  details['cache-fallback'].outputSummary = 'Recovered recent cached checkout evidence, marked as stale risk.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'mcp_server_error',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'failed',
      'mcp-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'policy-cache': 'recovered',
      'cache-final': 'warning',
    }),
    finalAnswer: finalAnswer(
      'Medium',
      'Confidence is downgraded because the live MCP server returned an internal error and cached evidence was used.',
    ),
    diagnosis,
    trustedContextBackup: backupByFailure.MCP_SERVER_ERROR,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'MCP_SERVER_ERROR HTTP 500',
      'Skipping retry because server returned deterministic 5xx',
      'Diagnosis: MCP_SERVER_ERROR, severity=High',
      'Recovery: fallback_to_cache_and_open_circuit',
      'Confidence downgraded High -> Medium',
      'Final answer generated with degraded context',
    ]),
  };
}

function emptyRetrievalRun(task: string): AgentRunResult {
  const diagnosis: Diagnosis = {
    failureCase: 'EMPTY_RETRIEVAL',
    severity: 'Medium',
    likelyRootCause: 'The retrieval query returned zero incident documents despite active checkout alerts.',
    userImpact: 'The answer relies on tool metrics and cached runbook context, not retrieved incident notes.',
    recoveryStrategy: 'Broaden retrieval scope and use cached runbook snippets for next actions.',
    confidenceImpact: 'Confidence downgraded from High to Medium.',
    recommendedOperatorActions: [
      'Check retrieval index freshness and filters for checkout service tags.',
      'Verify the incident document pipeline is ingesting recent alerts.',
      'Add an empty-result guardrail to retrieval-augmented agent runs.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'warning',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'cache-fallback': 'recovered',
    'llm-gateway': 'success',
    'final-answer': 'warning',
    'rule-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['mcp-tool'].outputSummary = 'Metrics found, but retrieval returned 0 incident notes.';
  details['mcp-tool'].detectedFailureCase = 'EMPTY_RETRIEVAL';
  details.diagnoser.diagnosis = 'EMPTY_RETRIEVAL, severity=Medium.';
  details.diagnoser.detectedFailureCase = 'EMPTY_RETRIEVAL';
  details['recovery-policy'].recoveryAction = 'broaden_retrieval_then_use_cached_runbook';
  details['cache-fallback'].outputSummary = 'Recovered trusted checkout incident runbook from cache.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'empty_retrieval',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'warning',
      'mcp-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'policy-cache': 'recovered',
      'cache-final': 'warning',
      'mcp-llm': 'success',
      'llm-final': 'warning',
    }),
    finalAnswer: finalAnswer(
      'Medium',
      'Confidence is downgraded because retrieval returned no incident notes; the answer uses metrics plus cached runbook guidance.',
    ),
    diagnosis,
    trustedContextBackup: backupByFailure.EMPTY_RETRIEVAL,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'Metrics returned: checkout_errors, provider_latency, deployment_diff',
      'Retrieval returned 0 documents',
      'Diagnosis: EMPTY_RETRIEVAL, severity=Medium',
      'Recovery: broaden_query + cached_runbook',
      'Confidence downgraded High -> Medium',
      'Final answer generated with retrieval gap noted',
    ]),
  };
}

function corruptedToolRun(task: string): AgentRunResult {
  const diagnosis: Diagnosis = {
    failureCase: 'TOOL_SCHEMA_VIOLATION',
    severity: 'High',
    likelyRootCause: 'The MCP tool returned malformed JSON that failed schema validation.',
    userImpact: 'The agent blocks unsafe evidence and answers only from validated cached fields.',
    recoveryStrategy: 'Quarantine corrupted response, fall back to last valid cache, and request schema fix.',
    confidenceImpact: 'Confidence downgraded from High to Medium.',
    recommendedOperatorActions: [
      'Validate MCP response contracts in CI and at runtime.',
      'Inspect the tool adapter that formats incident_context responses.',
      'Alert on schema-violation rate before agents consume malformed evidence.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'failed',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'cache-fallback': 'recovered',
    'final-answer': 'warning',
    'llm-gateway': 'skipped',
    'rule-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['mcp-tool'].errorMessage = 'Schema validation failed: evidence[2].timestamp is not ISO-8601.';
  details['mcp-tool'].detectedFailureCase = 'TOOL_SCHEMA_VIOLATION';
  details['mcp-tool'].outputSummary = 'Corrupted tool response quarantined before synthesis.';
  details.diagnoser.diagnosis = 'TOOL_SCHEMA_VIOLATION, severity=High.';
  details.diagnoser.detectedFailureCase = 'TOOL_SCHEMA_VIOLATION';
  details['recovery-policy'].recoveryAction = 'quarantine_response_and_fallback_to_cache';
  details['cache-fallback'].outputSummary = 'Recovered last valid schema-compliant evidence snapshot.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'corrupted_tool_response',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'failed',
      'mcp-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'policy-cache': 'recovered',
      'cache-final': 'warning',
    }),
    finalAnswer: finalAnswer(
      'Medium',
      'Confidence is downgraded because malformed tool output was rejected and the answer used the last valid cached evidence.',
    ),
    diagnosis,
    trustedContextBackup: backupByFailure.TOOL_SCHEMA_VIOLATION,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'Tool response received',
      'Schema validation failed: invalid evidence timestamp',
      'Diagnosis: TOOL_SCHEMA_VIOLATION, severity=High',
      'Recovery: quarantine_response_and_fallback_to_cache',
      'Confidence downgraded High -> Medium',
      'Final answer generated from trusted cached fields',
    ]),
  };
}

function llmProviderFailureRun(task: string): AgentRunResult {
  const diagnosis: Diagnosis = {
    failureCase: 'LLM_PROVIDER_FAILURE',
    severity: 'High',
    likelyRootCause: 'The primary LLM provider failed after tool evidence was collected.',
    userImpact: 'The operator still receives constrained guidance, but synthesis is less nuanced.',
    recoveryStrategy: 'Use deterministic rule-based fallback over validated evidence.',
    confidenceImpact: 'Confidence downgraded from High to Medium.',
    recommendedOperatorActions: [
      'Route through a secondary provider or TrueFoundry AI Gateway fallback policy.',
      'Measure provider failure rate and latency by model route.',
      'Keep incident-response rule templates available for provider outages.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'success',
    'llm-gateway': 'failed',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'rule-fallback': 'recovered',
    'final-answer': 'warning',
    'cache-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['llm-gateway'].errorMessage = 'Primary provider returned 503: model route unavailable.';
  details['llm-gateway'].detectedFailureCase = 'LLM_PROVIDER_FAILURE';
  details.diagnoser.diagnosis = 'LLM_PROVIDER_FAILURE, severity=High.';
  details.diagnoser.detectedFailureCase = 'LLM_PROVIDER_FAILURE';
  details['recovery-policy'].recoveryAction = 'rule_based_fallback';
  details['rule-fallback'].outputSummary = 'Applied deterministic incident-response template to validated evidence.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'llm_provider_failure',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'success',
      'mcp-llm': 'failed',
      'llm-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'policy-rule': 'recovered',
      'rule-final': 'warning',
    }),
    finalAnswer: finalAnswer(
      'Medium',
      'Confidence is downgraded because the primary LLM failed and a rule-based fallback generated the response.',
    ),
    diagnosis,
    trustedContextBackup: backupByFailure.LLM_PROVIDER_FAILURE,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'MCP returned 6 evidence items',
      'Calling LLM Gateway: primary_provider',
      'LLM_PROVIDER_FAILURE 503 route unavailable',
      'Diagnosis: LLM_PROVIDER_FAILURE, severity=High',
      'Recovery: rule_based_fallback',
      'Confidence downgraded High -> Medium',
      'Final answer generated from deterministic template',
    ]),
  };
}

function cacheMissRun(task: string): AgentRunResult {
  const diagnosis: Diagnosis = {
    failureCase: 'CACHE_MISS',
    severity: 'Critical',
    likelyRootCause: 'The live MCP call failed and no trusted cache entry exists for checkout incident context.',
    userImpact: 'The agent refuses to invent incident findings or remediation steps.',
    recoveryStrategy: 'Safe refusal with operator escalation.',
    confidenceImpact: 'Confidence becomes Low because required operational context is unavailable.',
    recommendedOperatorActions: [
      'Restore the MCP incident_context path before asking the agent for diagnosis.',
      'Create warm caches for critical services and test cache availability during chaos drills.',
      'Escalate to the on-call engineer with raw dashboards instead of synthetic agent output.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'failed',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'cache-fallback': 'failed',
    'safe-refusal': 'success',
    'final-answer': 'skipped',
    'llm-gateway': 'skipped',
    'rule-fallback': 'skipped',
  });

  details['mcp-tool'].errorMessage = 'Live incident_context call failed.';
  details['mcp-tool'].detectedFailureCase = 'CACHE_MISS';
  details.diagnoser.diagnosis = 'CACHE_MISS, severity=Critical.';
  details.diagnoser.detectedFailureCase = 'CACHE_MISS';
  details['cache-fallback'].errorMessage = 'No trusted cache exists for checkout:last_60m.';
  details['cache-fallback'].detectedFailureCase = 'CACHE_MISS';
  details['cache-fallback'].outputSummary = 'Cache lookup failed; no safe evidence source remains.';
  details['recovery-policy'].recoveryAction = 'safe_refusal';
  details['safe-refusal'].outputSummary = 'Refused speculative remediation because required context is unavailable.';
  details['final-answer'].outputSummary = 'Skipped to prevent hallucinated incident guidance.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'cache_miss',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'failed',
      'mcp-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'policy-cache': 'failed',
      'cache-refusal': 'success',
    }),
    finalAnswer: {
      summary:
        'I cannot safely complete this investigation because the required operational context is unavailable and no trusted cache exists. I will not generate speculative remediation steps.',
      nextActions: [
        'Restore live access to incident_context or provide verified checkout telemetry.',
        'Ask the on-call engineer to inspect dashboards directly until trusted data is available.',
        'Warm and validate cache coverage for critical services before the next incident.',
      ],
      confidence: 'Cannot answer safely',
      safetyNote: 'Safe refusal activated to avoid hallucinating operational facts.',
      refusal: true,
    },
    diagnosis,
    trustedContextBackup: backupByFailure.CACHE_MISS,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'MCP call failed',
      'Diagnosis: CACHE_MISS risk path detected',
      'Recovery: fallback_to_cache',
      'Cache lookup failed: checkout:last_60m unavailable',
      'No trusted evidence remains',
      'Safe refusal activated',
      'Final answer skipped to prevent speculation',
    ]),
  };
}

function partialEvidenceRun(task: string): AgentRunResult {
  const diagnosis: Diagnosis = {
    failureCase: 'PARTIAL_EVIDENCE',
    severity: 'Medium',
    likelyRootCause: 'The agent received metrics and deployment data but provider-status evidence was incomplete.',
    userImpact: 'The answer can identify likely causes, but it should not claim confirmed provider causality.',
    recoveryStrategy: 'Proceed with caveats, highlight missing evidence, and recommend verification.',
    confidenceImpact: 'Confidence downgraded from High to Medium.',
    recommendedOperatorActions: [
      'Verify third-party provider status from an independent status page or support channel.',
      'Add completeness checks for required evidence categories.',
      'Track which evidence sources were omitted in trace metadata.',
    ],
  };
  const details = createDetails(task, {
    'user-task': 'success',
    planner: 'success',
    'mcp-tool': 'warning',
    'llm-gateway': 'success',
    diagnoser: 'warning',
    'recovery-policy': 'success',
    'final-answer': 'warning',
    'cache-fallback': 'skipped',
    'rule-fallback': 'skipped',
    'safe-refusal': 'skipped',
  });

  details['mcp-tool'].outputSummary =
    'Returned checkout errors, deployment diff, and DB latency. Payment provider evidence is incomplete.';
  details['mcp-tool'].detectedFailureCase = 'PARTIAL_EVIDENCE';
  details.diagnoser.diagnosis = 'PARTIAL_EVIDENCE, severity=Medium.';
  details.diagnoser.detectedFailureCase = 'PARTIAL_EVIDENCE';
  details['recovery-policy'].recoveryAction = 'answer_with_caveats_and_verification_steps';
  details['final-answer'].outputSummary = 'Generated answer with explicit missing-evidence caveat.';
  annotateConfidenceImpact(details, diagnosis);
  addRecommendations(details, diagnosis.recommendedOperatorActions);

  return {
    failureMode: 'partial_evidence',
    task,
    nodeDetails: details,
    edgeStates: edgeStates({
      'task-planner': 'success',
      'planner-mcp': 'warning',
      'mcp-llm': 'success',
      'mcp-diagnoser': 'warning',
      'diagnoser-policy': 'success',
      'llm-final': 'warning',
    }),
    finalAnswer: finalAnswer(
      'Medium',
      'Confidence is downgraded because provider-status evidence is incomplete; treat provider causality as likely, not confirmed.',
    ),
    diagnosis,
    trustedContextBackup: backupByFailure.PARTIAL_EVIDENCE,
    logs: log([
      'Starting agent run',
      'Planning tool calls',
      'Calling MCP: incident_context',
      'MCP returned partial evidence: provider status missing',
      'Diagnosis: PARTIAL_EVIDENCE, severity=Medium',
      'Recovery: answer_with_caveats',
      'Confidence downgraded High -> Medium',
      'Final answer generated with verification actions',
    ]),
  };
}

function addRecommendations(details: Record<GraphNodeId, NodeDetail>, actions: string[]) {
  details.diagnoser.recommendedOperatorActions = actions;
  details['recovery-policy'].recommendedOperatorActions = actions;
}

function annotateConfidenceImpact(details: Record<GraphNodeId, NodeDetail>, diagnosis: Diagnosis) {
  const failureCase = diagnosis.failureCase as FailureCase;
  details['recovery-policy'].detectedFailureCase = failureCase;
  details['recovery-policy'].confidenceImpact = diagnosis.confidenceImpact;
  details['final-answer'].confidenceImpact = diagnosis.confidenceImpact;
  details['safe-refusal'].confidenceImpact = diagnosis.confidenceImpact;
}

function log(messages: string[]): LogEntry[] {
  const startSeconds = 12 * 3600 + 41 * 60 + 3;
  return messages.map((message, index) => {
    const total = startSeconds + index + (index > 3 ? 2 : 0);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const timestamp = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');

    return { timestamp, message };
  });
}
