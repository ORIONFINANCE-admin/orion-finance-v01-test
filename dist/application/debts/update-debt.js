import { parseMajorToCents } from '../../domain/money/money.js';
import { requireISODate } from '../shared/validation.js';
export async function updateDebtDetails(repository, gateway, input) {
    const current = await repository.getById(input.debtId);
    if (!current || current.profileId !== input.profileId || !current.active)
        throw new TypeError('Dívida não encontrada para o perfil ativo.');
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o nome da dívida.');
    const settlementOffer = input.settlementOffer ? parseMajorToCents(input.settlementOffer) : undefined;
    if (settlementOffer !== undefined && settlementOffer <= 0)
        throw new RangeError('Oferta de quitação deve ser maior que zero.');
    const offerExpiry = input.offerExpiry ? requireISODate(input.offerExpiry) : undefined;
    return gateway.update(input.profileId, 'debt', {
        ...current,
        name,
        creditor: input.creditor?.trim() || undefined,
        settlementOffer,
        offerExpiry,
        priority: input.priority,
        note: input.note?.trim() || undefined
    });
}
