# Devpost Draft

## Project Name
FailWise Agent

## Elevator Pitch
FailWise Agent is a self-debugging AgentOps dashboard for resilient AI agents. It turns hidden agent failures into an interactive execution graph with diagnosis, recovery policy, confidence impact, safe refusal, and operator remediation.

## Whole Story
Production AI agents fail in ways that are hard to see: MCP server timeouts, tool errors, corrupted responses, provider failures, empty retrieval, cache misses, and degraded context. Generic observability dashboards can show traces, but operators still need to understand whether the agent recovered safely, whether the final answer should be trusted, and what should be fixed next.

FailWise Agent demonstrates a failure-aware UX for resilient agents. The user selects a task and failure mode, then runs a deterministic simulation or a live DeepSeek provider probe. The app visualizes the agent runtime as an interactive execution graph. Each node shows status, latency, failure case, recovery action, confidence impact, and recommended operator actions.

The key safety behavior is safe refusal. When the cache miss scenario has no trusted live context and no trusted backup, FailWise refuses to invent an operational answer.

## Built With
React, Vite, TypeScript, React Flow, CSS, local deterministic scenario engine, DeepSeek provider probe through a local Vite proxy.

## Demo Scenarios
1. Normal deterministic run with high confidence.
2. MCP timeout with cache fallback and confidence downgrade.
3. Live DeepSeek provider probe with provider-failure recovery.
4. Cache miss with safe refusal.

## Why This Fits Resilient Agents
This project focuses on the exact operator experience needed when AI agent infrastructure fails: failure classification, fallback behavior, trusted context backup, confidence downgrade, and remediation guidance.

