import { asArray, asRecord, stringValue } from './shared.js';
export function parseLegacyBackup(raw) {
    const envelope = asRecord(JSON.parse(raw), 'Backup legado');
    const data = asRecord(envelope.data, 'Coleção data do backup legado');
    for (const required of ['profiles', 'accounts', 'transactions', 'goals', 'allocations', 'debts']) {
        asArray(data, required);
    }
    const version = stringValue(envelope, 'version', 'desconhecida');
    const exportedAtRaw = stringValue(envelope, 'exported_at');
    const exportedAt = Number.isFinite(Date.parse(exportedAtRaw)) ? new Date(exportedAtRaw).toISOString() : new Date(0).toISOString();
    return { version, exportedAt, data };
}
