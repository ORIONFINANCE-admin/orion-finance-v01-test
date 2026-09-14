import { replaceProfileDataAtomically } from '../../data/backup/restore.js';
import { IndexedDbMigrationRunRepository } from '../../data/indexeddb/metadata.js';
import { convertLegacyV025Backup } from './convert-v025.js';
import { fingerprintLegacyBackup } from './fingerprint.js';
export async function prepareLegacyMigration(raw, targetProfileId) {
    const fingerprint = await fingerprintLegacyBackup(raw);
    const converted = convertLegacyV025Backup(raw, targetProfileId);
    return { ...converted, fingerprint };
}
export async function applyPreparedLegacyMigration(prepared, targetProfileId, repository = new IndexedDbMigrationRunRepository()) {
    const previous = await repository.getByFingerprint(targetProfileId, prepared.fingerprint);
    if (previous?.status === 'applied')
        throw new Error('Este backup legado já foi migrado para este perfil.');
    const now = new Date().toISOString();
    const base = {
        id: `migration_${prepared.fingerprint.slice(0, 20)}`,
        profileId: targetProfileId,
        sourceVersion: prepared.report.sourceVersion,
        sourceFingerprint: prepared.fingerprint,
        status: 'prepared',
        warnings: prepared.report.warnings,
        createdAt: now
    };
    await repository.save(base);
    try {
        await replaceProfileDataAtomically(targetProfileId, prepared.data);
        const applied = { ...base, status: 'applied', appliedAt: new Date().toISOString() };
        await repository.save(applied);
        return applied;
    }
    catch (error) {
        await repository.save({ ...base, status: 'failed' });
        throw error;
    }
}
