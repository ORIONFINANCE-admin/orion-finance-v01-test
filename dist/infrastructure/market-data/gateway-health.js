export async function checkGatewayHealth(baseUrl, fetchImpl = fetch, timeoutMs = 3500) {
    const checkedAt = new Date().toISOString();
    if (!baseUrl)
        return { status: 'not-configured', checkedAt };
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
    const started = performance.now();
    try {
        const response = await fetchImpl(new URL(`${baseUrl}/health`), {
            cache: 'no-store',
            headers: { accept: 'application/json' },
            signal: controller.signal
        });
        if (!response.ok)
            return { status: 'unavailable', checkedAt, latencyMs: Math.round(performance.now() - started) };
        const payload = await response.json();
        if (payload.status !== 'ok')
            return { status: 'unavailable', checkedAt, latencyMs: Math.round(performance.now() - started) };
        return {
            status: 'healthy',
            checkedAt,
            latencyMs: Math.round(performance.now() - started),
            ...(Array.isArray(payload.capabilities) && payload.capabilities.every((item) => typeof item === 'string')
                ? { capabilities: payload.capabilities }
                : {})
        };
    }
    catch {
        return { status: 'unavailable', checkedAt, latencyMs: Math.round(performance.now() - started) };
    }
    finally {
        globalThis.clearTimeout(timer);
    }
}
