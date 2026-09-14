import { parseMajorToCents } from '../../domain/money/money.js';
import { createEntityId } from '../shared/ids.js';
function optionalDay(value, label) {
    if (value === undefined)
        return undefined;
    if (!Number.isSafeInteger(value) || value < 1 || value > 31)
        throw new RangeError(`${label} deve estar entre 1 e 31.`);
    return value;
}
export async function createCreditCard(cards, accounts, assets, input) {
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe um nome para o cartão.');
    if (input.paymentAccountId && !(await accounts.getById(input.paymentAccountId)))
        throw new TypeError('Conta de pagamento inválida.');
    if (input.guaranteeAssetId && !(await assets.getById(input.guaranteeAssetId)))
        throw new TypeError('Garantia selecionada inválida.');
    const openingLiability = parseMajorToCents(input.openingLiability || '0');
    if (openingLiability < 0)
        throw new RangeError('Fatura inicial não pode ser negativa.');
    const parsedLimit = input.creditLimit ? parseMajorToCents(input.creditLimit) : undefined;
    if (parsedLimit !== undefined && parsedLimit < 0)
        throw new RangeError('Limite não pode ser negativo.');
    const closingDay = optionalDay(input.closingDay, 'Fechamento');
    const dueDay = optionalDay(input.dueDay, 'Vencimento');
    const now = new Date().toISOString();
    const card = {
        id: createEntityId('card'), profileId: input.profileId, name, openingLiability, active: true,
        ...(input.institutionId ? { institutionId: input.institutionId } : {}),
        ...(input.paymentAccountId ? { paymentAccountId: input.paymentAccountId } : {}),
        ...(input.guaranteeAssetId ? { guaranteeAssetId: input.guaranteeAssetId } : {}),
        ...(parsedLimit !== undefined ? { creditLimit: parsedLimit } : {}),
        ...(closingDay !== undefined ? { closingDay } : {}),
        ...(dueDay !== undefined ? { dueDay } : {}),
        createdAt: now, updatedAt: now
    };
    await cards.save(card);
    return card;
}
