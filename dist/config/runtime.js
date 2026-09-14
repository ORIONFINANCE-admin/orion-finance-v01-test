function normalizeEndpoint(raw, baseHref) {
    if (typeof raw !== 'string' || !raw.trim())
        return null;
    let parsed;
    try {
        parsed = new URL(raw.trim(), baseHref);
    }
    catch {
        return null;
    }
    if (!['https:', 'http:'].includes(parsed.protocol))
        return null;
    const base = new URL(baseHref);
    const localDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (base.protocol === 'https:' && parsed.protocol !== 'https:' && !localDevelopment)
        return null;
    return parsed.toString().replace(/\/$/, '');
}
export function readMetaRuntimeConfig(documentRef = document, baseHref = window.location.href) {
    const meta = documentRef.querySelector('meta[name="orion-market-gateway"]');
    const marketGatewayUrl = normalizeEndpoint(meta?.content, baseHref);
    return { marketGatewayUrl, source: marketGatewayUrl ? 'meta' : 'default' };
}
export async function loadRuntimeConfig(environment = {
    documentRef: document,
    baseHref: window.location.href,
    fetchImpl: fetch
}) {
    const fromMeta = readMetaRuntimeConfig(environment.documentRef, environment.baseHref);
    if (fromMeta.marketGatewayUrl)
        return fromMeta;
    const configUrl = new URL('./runtime-config.json', environment.baseHref);
    try {
        const response = await environment.fetchImpl(configUrl, {
            cache: 'no-store',
            headers: { accept: 'application/json' }
        });
        if (!response.ok)
            return { marketGatewayUrl: null, source: 'default' };
        const payload = await response.json();
        const marketGatewayUrl = normalizeEndpoint(payload.marketGatewayUrl, environment.baseHref);
        return { marketGatewayUrl, source: marketGatewayUrl ? 'runtime-file' : 'default' };
    }
    catch {
        return { marketGatewayUrl: null, source: 'default' };
    }
}
