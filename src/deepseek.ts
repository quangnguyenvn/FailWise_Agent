import type { DeepSeekProbeResult } from './types';

export async function runDeepSeekProbe(task: string): Promise<DeepSeekProbeResult> {
  const response = await fetch('/api/deepseek-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task }),
  });

  const result = (await response.json()) as DeepSeekProbeResult;
  return result;
}
