import type { DeepSeekProbeResult } from './types';

export async function runDeepSeekProbe(task: string): Promise<DeepSeekProbeResult> {
  try {
    const response = await fetch('/api/deepseek-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ task }),
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        model: 'deepseek-chat',
        latencyMs: 0,
        statusCode: response.status,
        failureCase: 'LLM_PROVIDER_FAILURE',
        errorMessage:
          'Live DeepSeek probe endpoint is unavailable in this deployment. Configure the proxy/API route or use deterministic simulation.',
      };
    }

    return (await response.json()) as DeepSeekProbeResult;
  } catch (error) {
    return {
      ok: false,
      model: 'deepseek-chat',
      latencyMs: 0,
      failureCase: 'LLM_PROVIDER_FAILURE',
      errorMessage:
        error instanceof Error
          ? `Live DeepSeek probe could not reach the proxy: ${error.message}`
          : 'Live DeepSeek probe could not reach the proxy.',
    };
  }
}
