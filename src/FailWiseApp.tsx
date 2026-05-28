import { useMemo, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { DiagnosisPanel } from './components/DiagnosisPanel';
import { ExecutionGraph } from './components/ExecutionGraph';
import { FinalAnswerPanel } from './components/FinalAnswerPanel';
import { FullLogPanel } from './components/FullLogPanel';
import { NodeDetailsPanel } from './components/NodeDetailsPanel';
import { TrustedContextPanel } from './components/TrustedContextPanel';
import { runDeepSeekProbe } from './deepseek';
import * as scenarios from './scenarioEngine';
import type { DeepSeekProbeResult, FailureMode, GraphNodeId, RunSource } from './types';

function FailWiseApp() {
  const [task, setTask] = useState(scenarios.defaultTask);
  const [runSource, setRunSource] = useState<RunSource>('simulation');
  const [draftFailureMode, setDraftFailureMode] = useState<FailureMode>('none');
  const [activeFailureMode, setActiveFailureMode] = useState<FailureMode>('none');
  const [selectedNodeId, setSelectedNodeId] = useState<GraphNodeId>('final-answer');
  const [deepSeekProbe, setDeepSeekProbe] = useState<DeepSeekProbeResult | null>(null);
  const [isRunningLiveProbe, setIsRunningLiveProbe] = useState(false);
  const [runCount, setRunCount] = useState(1);

  const normalizedTask = task.trim() || scenarios.defaultTask;
  const run = useMemo(() => {
    if (runSource === 'deepseek_live' && deepSeekProbe) {
      return scenarios.simulateDeepSeekLiveRun(normalizedTask, deepSeekProbe);
    }

    return scenarios.simulateAgentRun(activeFailureMode, normalizedTask);
  }, [activeFailureMode, deepSeekProbe, normalizedTask, runCount, runSource]);

  async function handleRunAgent() {
    if (runSource === 'deepseek_live') {
      setIsRunningLiveProbe(true);
      setSelectedNodeId('llm-gateway');
      try {
        const probe = await runDeepSeekProbe(normalizedTask);
        setDeepSeekProbe(probe);
        setSelectedNodeId(probe.ok ? 'final-answer' : 'llm-gateway');
      } catch (error) {
        setDeepSeekProbe({
          ok: false,
          model: 'deepseek-v4-flash',
          latencyMs: 0,
          failureCase: 'LLM_PROVIDER_FAILURE',
          errorMessage: error instanceof Error ? error.message : 'Unable to reach the local DeepSeek proxy.',
        });
        setSelectedNodeId('llm-gateway');
      } finally {
        setIsRunningLiveProbe(false);
        setRunCount((count) => count + 1);
      }
      return;
    }

    setActiveFailureMode(draftFailureMode);
    setDeepSeekProbe(null);
    setRunCount((count) => count + 1);
    setSelectedNodeId(focusNodeForFailureMode(draftFailureMode));
  }

  function handleReset() {
    setTask(scenarios.defaultTask);
    setRunSource('simulation');
    setDraftFailureMode('none');
    setActiveFailureMode('none');
    setDeepSeekProbe(null);
    setSelectedNodeId('final-answer');
    setRunCount((count) => count + 1);
  }

  return (
    <ReactFlowProvider>
      <main className="app-shell">
        <header className="top-header">
          <div className="brand-lockup">
            <img className="brand-icon" src="/failwise-icon.svg" alt="" aria-hidden="true" />
            <div>
              <p className="eyebrow">TrueFoundry Resilient Agents Challenge</p>
              <h1>FailWise Agent</h1>
              <p>Self-debugging resilience for production AI agents</p>
            </div>
          </div>
          <div className="positioning-card">
            <span>Focused failure-aware AgentOps demo</span>
            <strong>Diagnosis, recovery, confidence impact, remediation.</strong>
          </div>
        </header>

        <p className="product-concept">
          FailWise Agent turns hidden agent failures into an interactive execution graph with diagnosis, recovery
          policy, confidence impact, and operator remediation.
        </p>

        <div className="workspace-layout">
          <aside className="inspector-stack" aria-label="Selected run diagnostics">
            <NodeDetailsPanel detail={run.nodeDetails[selectedNodeId]} />
            <DiagnosisPanel diagnosis={run.diagnosis} />
            <TrustedContextPanel backup={run.trustedContextBackup} />
          </aside>

          <div className="primary-workspace">
            <div className="run-overview-grid">
            <section className="panel scenario-panel">
              <div className="panel-header compact">
                <div>
                  <p className="eyebrow">Scenario Controls</p>
                  <h2>Simulate agent chaos</h2>
                </div>
              </div>
              <div className="control-body">
                <div className="task-field">
                  <label htmlFor="task">User task</label>
                  <textarea id="task" value={task} onChange={(event) => setTask(event.target.value)} rows={5} />
                </div>
                <div className="task-controls">
                  <label htmlFor="run-source">Execution source</label>
                  <select
                    id="run-source"
                    value={runSource}
                    onChange={(event) => {
                      const nextSource = event.target.value as RunSource;
                      setRunSource(nextSource);
                      setDeepSeekProbe(null);
                    }}
                  >
                    <option value="simulation">Deterministic simulation</option>
                    <option value="deepseek_live">Live DeepSeek provider probe</option>
                  </select>

                  <label htmlFor="failure-mode">Failure mode</label>
                  <select
                    id="failure-mode"
                    value={draftFailureMode}
                    disabled={runSource === 'deepseek_live'}
                    onChange={(event) => setDraftFailureMode(event.target.value as FailureMode)}
                  >
                    {scenarios.failureModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="button-row">
                    <button className="primary-button" type="button" onClick={handleRunAgent} disabled={isRunningLiveProbe}>
                      {isRunningLiveProbe ? 'Testing...' : 'Run Agent'}
                    </button>
                    <button className="secondary-button" type="button" onClick={handleReset}>
                      Reset
                    </button>
                  </div>
                  {runSource === 'deepseek_live' && (
                    <p className="control-hint">
                      Calls DeepSeek through the local proxy. If the provider fails, FailWise shows the recovery path.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <FinalAnswerPanel answer={run.finalAnswer} />
            </div>
            <ExecutionGraph run={run} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
            <FullLogPanel logs={run.logs} />
          </div>
        </div>
      </main>
    </ReactFlowProvider>
  );
}

export default FailWiseApp;

function focusNodeForFailureMode(failureMode: FailureMode): GraphNodeId {
  switch (failureMode) {
    case 'mcp_timeout':
    case 'mcp_server_error':
    case 'empty_retrieval':
    case 'corrupted_tool_response':
    case 'partial_evidence':
      return 'mcp-tool';
    case 'llm_provider_failure':
      return 'llm-gateway';
    case 'cache_miss':
      return 'safe-refusal';
    case 'none':
    default:
      return 'final-answer';
  }
}
