export function createFreshProfileData(profile, now = new Date().toISOString()) {
    const freshProfile = {
        id: profile.id,
        displayName: 'Usuário',
        locale: profile.locale ?? 'pt-BR',
        baseCurrency: profile.baseCurrency ?? 'BRL',
        createdAt: profile.createdAt,
        updatedAt: now
    };
    return {
        profiles: [freshProfile],
        accounts: [], transactions: [], creditCards: [], debts: [], assets: [], allocations: [],
        recurrences: [], recurrenceMonths: [], investmentInstruments: [], investmentTrades: []
    };
}
