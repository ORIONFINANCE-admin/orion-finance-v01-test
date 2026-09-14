import { parseMajorToCents } from '../../domain/money/money.js';
function optionalDay(value, label) {
    if (value === undefined)
        return undefined;
    if (!Number.isSafeInteger(value) || value < 1 || value > 31)
        throw new RangeError(`${label} deve estar entre 1 e 31.`);
    return value;
}
export async function updateCreditCardDetails(cards, accounts, assets, gateway, input) {
    const current = await cards.getById(input.cardId);
    if (!current || current.profileId !== input.profileId || !current.active)
        throw new TypeError('Cartão não encontrado para o perfil ativo.');
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe um nome para o cartão.');
    if (input.paymentAccountId) {
        const account = await accounts.getById(input.paymentAccountId);
        if (!account || account.profileId !== input.profileId || !account.active)
            throw new TypeError('Conta de pagamento inválida.');
    }
    if (input.guaranteeAssetId) {
        const asset = await assets.getById(input.guaranteeAssetId);
        if (!asset || asset.profileId !== input.profileId || !asset.active || asset.kind !== 'guarantee')
            throw new TypeError('Garantia selecionada inválida.');
    }
    const creditLimit = input.creditLimit ? parseMajorToCents(input.creditLimit) : undefined;
    if (creditLimit !== undefined && creditLimit < 0)
        throw new RangeError('Limite não pode ser negativo.');
    const closingDay = optionalDay(input.closingDay, 'Fechamento');
    const dueDay = optionalDay(input.dueDay, 'Vencimento');
    return gateway.update(input.profileId, 'credit-card', {
        ...current,
        name,
        institutionId: input.institutionId,
        paymentAccountId: input.paymentAccountId,
        guaranteeAssetId: input.guaranteeAssetId,
        creditLimit,
        closingDay,
        dueDay
    });
}
