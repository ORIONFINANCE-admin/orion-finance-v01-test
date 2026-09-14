import { APP_VERSION, BACKUP_FORMAT_VERSION, DATA_SCHEMA_VERSION } from '../../app/version.js';
export function createBackupEnvelope(data, exportedAt = new Date().toISOString()) {
    return {
        formatVersion: BACKUP_FORMAT_VERSION,
        schemaVersion: DATA_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        exportedAt,
        data
    };
}
export function serializeBackup(envelope) {
    return JSON.stringify(envelope, null, 2);
}
