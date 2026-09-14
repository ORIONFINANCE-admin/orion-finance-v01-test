const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu;
const BRL = /R\$\s*-?\s*\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/giu;
const LONG_DIGITS = /\b\d{8,}\b/gu;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/-]{10,}=*\b/giu;
export function redactDiagnosticMessage(input) {
    return input
        .replace(BEARER, 'Bearer [redacted]')
        .replace(EMAIL, '[email]')
        .replace(UUID, '[id]')
        .replace(BRL, '[valor]')
        .replace(LONG_DIGITS, '[número]')
        .slice(0, 240);
}
