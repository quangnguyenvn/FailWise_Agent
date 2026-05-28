# FailWise Agent

**One-line pitch:** FailWise Agent is a focused failure-aware AgentOps demo for resilient AI agents.

FailWise Agent is a self-debugging AgentOps dashboard for resilient AI agents. It turns hidden agent failures into an interactive execution graph with diagnosis, recovery policy, confidence impact, and operator remediation.

## Problem

Production AI agents depend on MCP servers, retrieval systems, LLM gateways, caches, and incident tools. Generic traces can show that a request happened, but operators still need to know whether the agent understood the failure, recovered safely, downgraded confidence, or refused to hallucinate.

Most observability tools show what happened. FailWise Agent shows:

- Where the agent failed.
- What failure case it belongs to.
- Why it matters.
- What recovery policy was applied.
- How confidence was impacted.
- What the operator should fix next.

## Solution

FailWise Agent demonstrates a deterministic resilience layer for an incident-response agent. The hero feature is an Interactive Failure-Aware Execution Graph where each runtime step exposes status, latency, failure badge, diagnosis, recovery behavior, and operator actions.

**Key message:** This agent does not just fail over. It understands how it failed, shows where it failed, explains the impact, and recommends how operators should fix the system.

## How FailWise Agent Differs From Generic Observability Dashboards

FailWise Agent is not trying to replace full observability platforms. It is a focused hackathon prototype that demonstrates failure-aware UX for resilient agents: diagnosis, recovery, confidence impact, safe refusal, and operator remediation.

Generic observability dashboards are great for traces, metrics, logs, and production analytics. FailWise Agent narrows the scope to a specific resilient-agent question: when infrastructure chaos hits an agent run, can the operator immediately see the failure case, recovery path, trust impact, and next fix?

## Why This Fits The TrueFoundry Resilient Agents Challenge

The challenge is about agent behavior under infrastructure chaos. FailWise Agent directly simulates MCP timeout, MCP server error, empty retrieval, corrupted tool response, LLM provider failure, cache miss, and partial evidence. It shows resilient behavior in the UI instead of hiding it in logs: fallback routing, schema rejection, confidence downgrade, and safe refusal.

This makes it easy to demo how a production AI platform such as TrueFoundry could expose failure-aware agent runs through AI Gateway policies, MCP integrations, and trace data.

## Key Features

- Interactive React Flow execution graph with draggable runtime nodes.
- Node cards with status, short description, latency, and failure badges.
- Clickable node details with purpose, input, output, latency, error, detected failure case, recovery action, confidence impact, and operator recommendations.
- Debug Diagnosis panel with severity, root cause, user impact, recovery strategy, confidence impact, and operator actions.
- Final Answer panel with summary, suggested next actions, confidence, and safety note.
- Safe refusal when no trusted operational context or cache exists.
- Expandable Full Run Log with timestamp-like runtime and diagnosis events.
- Local deterministic scenario engine with no backend.

## Failure Modes Demonstrated

- `NO_FAILURE`
- `MCP_TIMEOUT`
- `MCP_SERVER_ERROR`
- `EMPTY_RETRIEVAL`
- `TOOL_SCHEMA_VIOLATION`
- `LLM_PROVIDER_FAILURE`
- `CACHE_MISS`
- `PARTIAL_EVIDENCE`
- `UNKNOWN_FAILURE` as the catch-all classification used by the type system for future expansion

## Interactive Failure-Aware Execution Graph

The graph is the main product surface. Each node represents one runtime step:

- User Task
- Agent Planner
- MCP Tool Call
- LLM Gateway
- Failure Diagnoser
- Recovery Policy
- Cache Fallback
- Rule-Based Fallback
- Final Answer
- Safe Refusal

The visual language is intentionally simple:

- Green means success.
- Red means failed.
- Yellow/orange means warning or degraded evidence.
- Purple means recovered through fallback.
- Gray means skipped.

## Mock Incident Domain

The demo uses a generic enterprise checkout incident:

- Error rate increased from 1.2% to 8.7%.
- Payment gateway timeout rate increased.
- A recent deployment touched checkout retry logic.
- Database latency is normal.
- A third-party payment provider has elevated latency.
- Cache hit rate dropped slightly.

## How To Run Locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in your terminal.

For the live DeepSeek provider probe, create a local `.env` file:

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat
```

The key is read only by the local Vite proxy. It is not bundled into the browser.

To verify a production build:

```bash
npm run build
```

## Demo Script For Judges

### 1. Normal Run

1. Keep failure mode set to **None**.
2. Click **Run Agent**.
3. Show the mostly green graph path from User Task to Final Answer.
4. Point out `NO_FAILURE`, high confidence, and a complete incident answer.

### 2. MCP Timeout With Cache Fallback

1. Change failure mode to **MCP timeout**.
2. Click **Run Agent**.
3. Show the red MCP Tool Call node, warning Failure Diagnoser, successful Recovery Policy, purple Cache Fallback, and warning Final Answer.
4. Click Failure Diagnoser and Recovery Policy to show failure classification, confidence downgrade, and operator remediation.
5. Open Full Run Log and highlight timeout, retry, diagnosis, fallback, and confidence downgrade events.

### 3. Cache Miss With Safe Refusal

1. Change failure mode to **Cache miss / no cache available**.
2. Click **Run Agent**.
3. Show MCP Tool Call failed, Cache Fallback failed, Safe Refusal succeeded, and Final Answer skipped.
4. Emphasize that the agent refuses to invent incident findings when no trusted data exists.

## Future Work

- TrueFoundry AI Gateway integration.
- Real MCP servers.
- Provider fallback routing.
- OpenTelemetry traces.
- Persistent run history.
- Real incident tools such as Datadog, Jira, Slack, GitHub, or PagerDuty.
