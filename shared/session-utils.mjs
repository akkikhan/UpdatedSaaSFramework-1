export function shouldRetry(attempts, max = 3) {
  return attempts < max;
}

export function updateSessionDiagnostics(diag = {}, error = 'error') {
  const now = Date.now();
  const logs = Array.isArray(diag.logs) ? diag.logs.slice() : [];
  logs.push({ time: now, error });
  return {
    lastError: error,
    lastErrorTime: now,
    attempts: (diag.attempts || 0) + 1,
    logs,
  };
}

export async function fetchWithRetry(fetchFn, url, options = {}, diag = { logs: [] }, max = 3) {
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      const res = await fetchFn(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      diag.logs.push({ time: Date.now(), error, attempt: attempt + 1 });
      if (!shouldRetry(attempt + 1, max)) throw err;
    }
  }
}
