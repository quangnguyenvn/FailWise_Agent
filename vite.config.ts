import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    cacheDir: 'node_modules/.vite-recording',
    preview: {
      allowedHosts: true,
    },
    plugins: [react(), deepSeekProxyPlugin(env.DEEPSEEK_API_KEY, env.DEEPSEEK_MODEL || 'deepseek-chat')],
  };
});

function deepSeekProxyPlugin(apiKey: string | undefined, model: string): Plugin {
  return {
    name: 'failwise-deepseek-proxy',
    configureServer(server) {
      server.middlewares.use('/api/deepseek-test', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, {
            ok: false,
            model,
            latencyMs: 0,
            failureCase: 'LLM_PROVIDER_FAILURE',
            errorMessage: 'Method not allowed.',
          });
          return;
        }

        const startedAt = Date.now();

        if (!apiKey || apiKey === 'false') {
          sendJson(res, 200, {
            ok: false,
            model,
            latencyMs: Date.now() - startedAt,
            failureCase: 'LLM_PROVIDER_FAILURE',
            errorMessage:
              'DEEPSEEK_API_KEY is not configured for live provider calls. Using the failure-aware recovery path instead.',
          });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const deepSeekResponse = await fetch(DEEPSEEK_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a concise incident-response assistant. Answer in 4 short bullets: likely cause, evidence, next actions, confidence caveat.',
                },
                {
                  role: 'user',
                  content: buildDeepSeekPrompt(String(body.task ?? 'Investigate the checkout incident.')),
                },
              ],
              stream: false,
              max_tokens: 420,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const latencyMs = Date.now() - startedAt;
          const payload = await deepSeekResponse.json().catch(() => null);

          if (!deepSeekResponse.ok) {
            sendJson(res, 200, {
              ok: false,
              model,
              latencyMs,
              statusCode: deepSeekResponse.status,
              failureCase: 'LLM_PROVIDER_FAILURE',
              errorMessage:
                payload?.error?.message ??
                `DeepSeek returned HTTP ${deepSeekResponse.status} ${deepSeekResponse.statusText}.`,
            });
            return;
          }

          const content = payload?.choices?.[0]?.message?.content;

          if (typeof content !== 'string' || content.trim().length === 0) {
            sendJson(res, 200, {
              ok: false,
              model,
              latencyMs,
              failureCase: 'TOOL_SCHEMA_VIOLATION',
              errorMessage: 'DeepSeek response did not include choices[0].message.content.',
            });
            return;
          }

          sendJson(res, 200, {
            ok: true,
            model,
            latencyMs,
            content: content.trim(),
          });
        } catch (error) {
          const aborted = error instanceof Error && error.name === 'AbortError';
          sendJson(res, 200, {
            ok: false,
            model,
            latencyMs: Date.now() - startedAt,
            failureCase: 'LLM_PROVIDER_FAILURE',
            errorMessage: aborted
              ? 'DeepSeek provider timed out after 8000ms.'
              : error instanceof Error
                ? error.message
                : 'DeepSeek provider call failed.',
          });
        }
      });
    },
  };
}

function buildDeepSeekPrompt(task: string) {
  return [
    `Task: ${task}`,
    '',
    'Trusted incident evidence:',
    '- Error rate increased from 1.2% to 8.7%.',
    '- Payment gateway timeout rate increased.',
    '- Recent deployment touched checkout retry logic.',
    '- Database latency is normal.',
    '- Third-party payment provider has elevated latency.',
    '- Cache hit rate dropped slightly.',
  ].join('\n');
}

function readJsonBody(req: NodeJS.ReadableStream): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: NodeJS.WritableStream & { statusCode?: number; setHeader?: (key: string, value: string) => void }, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader?.('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
