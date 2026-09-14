import { addCents, cents } from '../money/money.js';
const ONE_HUNDRED_PERCENT_PPM = 1_000_000;
export function ratePpm(value) {
    if (!Number.isSafeInteger(value))
        throw new RangeError('A taxa em ppm deve ser um inteiro seguro.');
    if (value < 0)
        throw new RangeError('A taxa não pode ser negativa.');
    return value;
}
export function parsePercentToPpm(rawValue) {
    const original = typeof rawValue === 'number' ? rawValue.toString() : rawValue;
    const normalized = original.trim().replace('%', '').replace(',', '.');
    const match = /^(\d+)(?:\.(\d{1,4}))?$/.exec(normalized);
    if (!match)
        throw new TypeError(`Taxa percentual inválida: ${original}`);
    const wholeText = match[1];
    if (wholeText === undefined)
        throw new TypeError(`Taxa percentual inválida: ${original}`);
    const whole = BigInt(wholeText);
    const fraction = BigInt((match[2] ?? '').padEnd(4, '0'));
    const ppm = whole * 10000n + fraction;
    const numeric = Number(ppm);
    if (!Number.isSafeInteger(numeric))
        throw new RangeError('Taxa fora do intervalo suportado.');
    return ratePpm(numeric);
}
function divideRoundHalfUp(numerator, denominator) {
    if (denominator <= 0n)
        throw new RangeError('Denominador inválido.');
    if (numerator < 0n)
        return -divideRoundHalfUp(-numerator, denominator);
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    return remainder * 2n >= denominator ? quotient + 1n : quotient;
}
export function calculateInterest(principal, rate) {
    const raw = divideRoundHalfUp(BigInt(principal) * BigInt(rate), BigInt(ONE_HUNDRED_PERCENT_PPM));
    const numeric = Number(raw);
    if (!Number.isSafeInteger(numeric))
        throw new RangeError('Juros fora do intervalo monetário suportado.');
    return cents(numeric);
}
export function applyRate(principal, rate) {
    return addCents(principal, calculateInterest(principal, rate));
}
