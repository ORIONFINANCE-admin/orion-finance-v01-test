import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
export async function createAsset(repository, input) {
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o nome do ativo.');
    const openingValue = parseMajorToCents(input.openingValue || '0');
    if (openingValue < 0)
        throw new RangeError('Valor inicial do ativo não pode ser negativo.');
    const now = new Date().toISOString();
    const asset = {
        id: createEntityId('asset'), profileId: input.profileId, name, kind: input.kind,
        openingValue, liquidity: input.liquidity, active: true, includeInNetWorth: true,
        ...(input.institutionId ? { institutionId: input.institutionId } : {}),
        ...(input.policyId ? { policyId: input.policyId.trim() } : {}),
        createdAt: now, updatedAt: now
    };
    await repository.save(asset);
    return asset;
}
