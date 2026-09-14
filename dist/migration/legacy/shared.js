import { parseMajorToCents } from '../../domain/money/money.js';
import { parsePercentToPpm } from '../../domain/rates/rate.js';
export function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function asRecord(value, label) {
    if (!isRecord(value))
        throw new TypeError(`${label} inválido.`);
    return value;
}
export function asArray(record, key) {
    const value = record[key];
    if (value === undefined)
        return [];
    if (!Array.isArray(value))
        throw new TypeError(`Coleção legada inválida: ${key}.`);
    return value;
}
export function stringValue(record, key, fallback = '') {
    const value = record[key];
    return typeof value === 'string' ? value : fallback;
}
export function booleanValue(record, key, fallback = false) {
    const value = record[key];
    return typeof value === 'boolean' ? value : fallback;
}
export function numberValue(record, key, fallback = 0) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
        return Number(value);
    return fallback;
}
export function optionalString(record, key) {
    const value = stringValue(record, key).trim();
    return value ? value : undefined;
}
export function legacyMoney(record, key, fallback = 0) {
    return parseMajorToCents(String(numberValue(record, key, fallback)));
}
export function optionalRate(record, key) {
    const value = numberValue(record, key, 0);
    return value > 0 ? parsePercentToPpm(String(value)) : undefined;
}
export function isoDateFromTimestamp(value, fallback) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : fallback;
}
export function createdAt(record, fallback) {
    const value = stringValue(record, 'created_at');
    return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : fallback;
}
export function updatedAt(record, fallback) {
    const value = stringValue(record, 'updated_at');
    return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : fallback;
}
