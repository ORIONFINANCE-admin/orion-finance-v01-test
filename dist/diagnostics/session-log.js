import { redactDiagnosticMessage } from '../privacy/redaction.js';
const MAX_EVENTS = 50;
const events = [];
function safeCount(value) {
    return Number.isSafeInteger(value) && (value ?? -1) >= 0 ? value : 0;
}
function diagnosticMessage(code, context) {
    switch (code) {
        case 'SCREEN_RENDER': return 'Falha ao renderizar uma área do aplicativo.';
        case 'MARKET_GATEWAY_HEALTH': {
            const status = context?.status ?? 'unavailable';
            return `Market Gateway: ${status}.`;
        }
        case 'MARKET_REFRESH':
            return `Cotações: ${safeCount(context?.fresh)} novas, ${safeCount(context?.cached)} cache, ${safeCount(context?.unavailable)} indisponíveis.`;
        case 'MARKET_REFRESH_FAILED': return 'Falha ao atualizar cotações.';
        case 'FUNDAMENTAL_REFRESH':
            return `Fundamentos: ${safeCount(context?.fresh)} novos, ${safeCount(context?.cached)} cache, ${safeCount(context?.unsupported)} n/a, ${safeCount(context?.unavailable)} indisponíveis.`;
        case 'FUNDAMENTAL_REFRESH_FAILED': return 'Falha ao atualizar fundamentos.';
        case 'PWA_SW_REGISTER': return 'Falha ao registrar o service worker nesta sessão.';
        case 'UNHANDLED_REJECTION': return 'Promise rejeitada sem tratamento.';
        case 'WINDOW_ERROR': return 'Erro global capturado.';
        case 'APP_BOOT': return 'Falha ao iniciar o aplicativo.';
    }
}
export function recordDiagnostic(code, level, context) {
    events.push({
        timestamp: new Date().toISOString(),
        code,
        level,
        message: redactDiagnosticMessage(diagnosticMessage(code, context))
    });
    if (events.length > MAX_EVENTS)
        events.splice(0, events.length - MAX_EVENTS);
}
export function listDiagnostics() {
    return [...events];
}
