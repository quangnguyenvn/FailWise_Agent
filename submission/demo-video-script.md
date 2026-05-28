# FailWise Agent Demo Video Script

Target length: 75-85 seconds
Voice: Vietnamese male, medium speed
Format: screen recording + captions

## One-Take Narration

FailWise Agent is a focused failure-aware AgentOps dashboard for resilient AI agents.

Most observability tools only show what happened. FailWise shows where the agent failed, why it matters, how it recovered, and what operators should fix next.

Here is the default incident task: investigate why checkout errors increased in the last hour and suggest next actions.

First, I run the deterministic normal scenario. The graph follows user task, planner, MCP tool call, LLM gateway, and final answer, with high confidence.

Now I switch to an MCP timeout. MCP fails, the diagnoser classifies the issue, recovery uses trusted cache fallback, and confidence is downgraded.

Next is the live DeepSeek provider probe. If provider calls fail, FailWise marks LLM provider failure and routes to safe fallback instead of hiding the issue.

The side panels show node details, diagnosis, trusted context backup, and final answer. The graph is interactive, so each step exposes input, output, latency, errors, and recovery action.

At the bottom, the full run log gives a timestamped trace of tool calls, failures, diagnosis events, recovery policy, and confidence changes.

Most importantly, in a cache miss with no trusted context, FailWise refuses to invent an incident answer.

FailWise Agent turns hidden agent failures into diagnosis, recovery, confidence impact, safe refusal, and operator remediation.

## Screen Recording Shot List

1. Open `http://127.0.0.1:5173/?demo=1`.
2. Show the header and product concept for 4 seconds.
3. Keep default scenario `None`, click `Run Agent`.
4. Briefly click `Final Answer` node, then `MCP Tool Call` node.
5. Switch failure mode to `MCP timeout`, click `Run Agent`.
6. Click the failed `MCP Tool Call` node, then `Cache Fallback`, then `Final Answer`.
7. Scroll slightly to show `Full Run Log`.
8. Switch execution source to `Live DeepSeek provider probe`, click `Run Agent`.
9. Show the LLM Gateway and diagnosis/recovery state.
10. Switch back to deterministic simulation, select `Cache miss / no cache available`, click `Run Agent`.
11. Show `Safe Refusal`, final answer refusal, and log.
12. End on the full graph and final answer panel.

## Clipchamp Steps

1. Record screen at 1080p if available.
2. Import the recording into Clipchamp.
3. Use Text to Speech:
   - Language: Vietnamese
   - Voice: male / Nam
   - Speed: Medium
4. Paste the narration above.
5. Import `submission/failwise-demo-captions.srt` if Clipchamp accepts SRT, or use auto-caption then replace text with the SRT lines.
6. Trim pauses so the final video is between 1:00 and 1:30.
7. Export 1080p.
