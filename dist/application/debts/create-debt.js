import { parseMajorToCents } from '../../domain/money/money.js';
import { parsePercentToPpm } from '../../domain/rates/rate.js';
import { createEntityId } from '../shared/ids.js';
export async function createDebt(repository, input) {
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe qual é a dívida.');
    const openingBalance = parseMajorToCents(input.openingBalance);
    if (openingBalance <= 0)
        throw new RangeError('Informe quanto ainda falta pagar.');
    const settlementOffer = input.settlementOffer ? parseMajorToCents(input.settlementOffer) : undefined;
    if (settlementOffer !== undefined && settlementOffer <= 0)
        throw new RangeError('O valor da oferta deve ser maior que zero.');
    const now = new Date().toISOString();
    const debt = {
        id: createEntityId('debt'), profileId: input.profileId, name, openingBalance, active: true,
        ...(input.creditor?.trim() ? { creditor: input.creditor.trim() } : {}),
        ...(input.kind ? { kind: input.kind } : {}),
        ...(input.baseDate ? { baseDate: input.baseDate } : {}),
        ...(input.institutionId ? { institutionId: input.institutionId } : {}),
        ...(settlementOffer !== undefined ? { settlementOffer } : {}),
        ...(input.offerExpiry ? { offerExpiry: input.offerExpiry } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.note?.trim() ? { note: input.note.trim() } : {}),
        ...(input.monthlyRate ? { monthlyRate: parsePercentToPpm(input.monthlyRate) } : {}),
        ...(input.annualRate ? { annualRate: parsePercentToPpm(input.annualRate) } : {}),
        createdAt: now, updatedAt: now
    };
    await repository.save(debt);
    return debt;
}
