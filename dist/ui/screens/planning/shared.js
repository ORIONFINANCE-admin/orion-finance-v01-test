import { listInstitutions } from '../../../catalog/institutions.js';
export async function accountOptions(context) {
    const accounts = await context.repositories.accounts.listByProfile(context.profile.id);
    return accounts.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name }));
}
export async function assetOptions(context, kind) {
    const assets = await context.repositories.assets.listByProfile(context.profile.id);
    return assets.filter((item) => item.active && (!kind || item.kind === kind)).map((item) => ({ value: item.id, label: item.name }));
}
export function institutionOptions() {
    return listInstitutions().map((item) => ({ value: item.id, label: item.name }));
}
export function todayISO() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function currentMonth() {
    return todayISO().slice(0, 7);
}
export function centsToInput(value) {
    return (value / 100).toFixed(2).replace('.', ',');
}
