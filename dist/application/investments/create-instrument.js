import { createEntityId } from '../shared/ids.js';
function normalizeSymbol(value) {
    const symbol = value.trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,18}$/.test(symbol))
        throw new TypeError('Informe um código de ativo válido.');
    return symbol;
}
export async function createInvestmentInstrument(repository, input, now = new Date()) {
    const symbol = normalizeSymbol(input.symbol);
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o nome do ativo.');
    const venue = input.venue ?? 'B3';
    const currency = input.currency ?? 'BRL';
    const existing = (await repository.listByProfile(input.profileId))
        .find((item) => item.active && item.symbol === symbol && item.venue === venue);
    if (existing)
        throw new Error(`${symbol} já está cadastrado na carteira.`);
    const timestamp = now.toISOString();
    const instrument = {
        id: createEntityId('instrument'),
        profileId: input.profileId,
        symbol,
        venue,
        currency,
        name,
        assetClass: input.assetClass,
        active: true,
        ...(input.providerSymbol?.trim() ? { providerSymbol: normalizeSymbol(input.providerSymbol) } : {}),
        createdAt: timestamp,
        updatedAt: timestamp
    };
    await repository.save(instrument);
    return instrument;
}
