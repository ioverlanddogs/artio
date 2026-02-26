const DEFAULT_TIMEOUT_MS = 4_000;

export class FetchTimeoutError extends Error {
  code = "provider_timeout" as const;

  constructor(message = "External request timed out") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export async function fetchWithTimeout(input: URL | RequestInfo, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  try {
    return await fetch(input, { ...init, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new FetchTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

