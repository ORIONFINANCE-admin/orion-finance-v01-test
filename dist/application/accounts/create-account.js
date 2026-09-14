import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
export async function createAccount(repository, input) {
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe um nome para a conta.');
    const now = new Date().toISOString();
    const account = {
        id: createEntityId('acc'), profileId: input.profileId, institutionId: input.institutionId,
        name, type: input.type, openingBalance: parseMajorToCents(input.openingBalance || '0'),
        color: input.color, active: true, includeInAvailable: true, createdAt: now, updatedAt: now
    };
    await repository.save(account);
    return account;
}
