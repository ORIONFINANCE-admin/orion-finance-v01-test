import { calculateAssetPosition } from '../../domain/assets/position.js';
import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
import { requireISODate } from '../shared/validation.js';
export async function recordAssetOperation(transactions, assets, accounts, input) {
    const asset = await assets.getById(input.assetId);
    if (!asset || asset.profileId !== input.profileId || !asset.active)
        throw new TypeError('Ativo selecionado não está disponível.');
    const amount = parseMajorToCents(input.amount);
    if (input.kind !== 'valuation' && amount <= 0)
        throw new RangeError('O valor deve ser maior que zero.');
    if (input.kind === 'valuation' && amount === 0)
        throw new RangeError('Ajuste de valorização não pode ser zero.');
    const date = requireISODate(input.date);
    const now = new Date().toISOString();
    const history = await transactions.listByProfile(input.profileId);
    const currentAssetValue = calculateAssetPosition(asset, history).currentValue;
    if (input.kind === 'valuation' && currentAssetValue + amount < 0) {
        throw new RangeError('Ajuste não pode tornar o valor do ativo negativo.');
    }
    if (input.kind === 'contribution' || input.kind === 'withdrawal') {
        const account = await accounts.getById(input.accountId);
        if (!account || account.profileId !== input.profileId || !account.active)
            throw new TypeError('Conta selecionada não está disponível.');
        if (input.kind === 'withdrawal') {
            if (amount > currentAssetValue)
                throw new RangeError('Resgate excede o valor atual do ativo.');
        }
        const transaction = input.kind === 'contribution'
            ? { id: createEntityId('txn'), profileId: input.profileId, kind: 'asset-contribution', assetId: asset.id, accountId: account.id, amount, date, description: input.description?.trim() || `Aporte · ${asset.name}`, entrySource: 'manual', createdAt: now }
            : { id: createEntityId('txn'), profileId: input.profileId, kind: 'asset-withdrawal', assetId: asset.id, accountId: account.id, amount, date, description: input.description?.trim() || `Resgate · ${asset.name}`, entrySource: 'manual', createdAt: now };
        await transactions.save(transaction);
        return transaction;
    }
    const transaction = input.kind === 'yield'
        ? { id: createEntityId('txn'), profileId: input.profileId, kind: 'asset-yield', assetId: asset.id, amount, date, description: input.description?.trim() || `Rendimento · ${asset.name}`, entrySource: 'manual', createdAt: now }
        : { id: createEntityId('txn'), profileId: input.profileId, kind: 'asset-valuation', assetId: asset.id, amount, date, description: input.description?.trim() || `Valorização · ${asset.name}`, entrySource: 'manual', createdAt: now };
    await transactions.save(transaction);
    return transaction;
}
