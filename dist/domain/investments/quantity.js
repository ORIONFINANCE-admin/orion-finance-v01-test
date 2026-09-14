import { QUANTITY_SCALE } from './models.js';
export function quantityUnits(value) {
    if (!Number.isSafeInteger(value) || value < 0)
        throw new RangeError('Quantidade interna deve ser inteiro seguro não negativo.');
    return value;
}
export function parseQuantity(value) {
    const normalized = value.trim().replace(',', '.');
    if (!/^\d+(?:\.\d{1,6})?$/.test(normalized))
        throw new TypeError('Quantidade inválida. Use até 6 casas decimais.');
    const [whole = '0', fraction = ''] = normalized.split('.');
    const padded = fraction.padEnd(6, '0');
    const result = Number(whole) * QUANTITY_SCALE + Number(padded);
    return quantityUnits(result);
}
export function formatQuantity(value) {
    const whole = Math.trunc(value / QUANTITY_SCALE);
    const fraction = String(value % QUANTITY_SCALE).padStart(6, '0').replace(/0+$/, '');
    return fraction ? `${whole},${fraction}` : String(whole);
}
