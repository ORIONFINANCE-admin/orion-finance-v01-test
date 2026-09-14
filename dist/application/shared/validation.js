export function requireISODate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new TypeError('Informe uma data válida.');
    return value;
}
export function requireYearMonth(value) {
    if (!/^\d{4}-\d{2}$/.test(value))
        throw new TypeError('Informe um mês válido.');
    return value;
}
export function requireDayOfMonth(value) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 31)
        throw new RangeError('Dia do mês deve estar entre 1 e 31.');
    return value;
}
