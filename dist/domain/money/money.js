function assertSafeInteger(value, label) {
    if (!Number.isSafeInteger(value)) {
        throw new RangeError(`${label} deve ser um inteiro seguro.`);
    }
}
export function cents(value) {
    assertSafeInteger(value, 'Centavos');
    return value;
}
export const ZERO_CENTS = cents(0);
export function addCents(left, right) {
    const result = left + right;
    assertSafeInteger(result, 'Resultado monetário');
    return cents(result);
}
export function subtractCents(left, right) {
    const result = left - right;
    assertSafeInteger(result, 'Resultado monetário');
    return cents(result);
}
export function negateCents(value) {
    return cents(-value);
}
export function sumCents(values) {
    return values.reduce((total, value) => addCents(total, value), ZERO_CENTS);
}
export function maxCents(left, right) {
    return left >= right ? left : right;
}
export function minCents(left, right) {
    return left <= right ? left : right;
}
export function parseMajorToCents(rawValue) {
    const original = typeof rawValue === 'number' ? rawValue.toString() : rawValue;
    let raw = original
        .trim()
        .replace(/R\$/gi, '')
        .replace(/[\s\u00a0]/g, '');
    if (!raw)
        throw new TypeError('Valor monetário vazio.');
    const hasComma = raw.includes(',');
    const hasDot = raw.includes('.');
    if (hasComma && hasDot) {
        const commaIndex = raw.lastIndexOf(',');
        const dotIndex = raw.lastIndexOf('.');
        const decimalSeparator = commaIndex > dotIndex ? ',' : '.';
        const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
        raw = raw.split(thousandsSeparator).join('');
        if (decimalSeparator === ',')
            raw = raw.replace(',', '.');
    }
    else if (hasComma) {
        raw = raw.replace(',', '.');
    }
    const match = /^([+-]?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
    if (!match)
        throw new TypeError(`Valor monetário inválido: ${original}`);
    const sign = match[1] === '-' ? -1n : 1n;
    const majorPart = match[2];
    if (majorPart === undefined)
        throw new TypeError(`Valor monetário inválido: ${original}`);
    const minorPart = (match[3] ?? '').padEnd(2, '0');
    const absolute = BigInt(majorPart) * 100n + BigInt(minorPart || '0');
    const signed = absolute * sign;
    const numeric = Number(signed);
    assertSafeInteger(numeric, 'Valor monetário convertido');
    return cents(numeric);
}
export function formatBRL(value) {
    const negative = value < 0;
    const absolute = Math.abs(value);
    const major = Math.trunc(absolute / 100);
    const minor = absolute % 100;
    const majorText = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(major);
    return `${negative ? '-' : ''}R$ ${majorText},${String(minor).padStart(2, '0')}`;
}
