function sourceProfileIds(data) {
    const ids = new Set();
    for (const profile of data.profiles)
        ids.add(profile.id);
    const groups = [data.accounts, data.transactions, data.creditCards, data.debts, data.assets, data.allocations, data.recurrences, data.recurrenceMonths, data.investmentInstruments, data.investmentTrades];
    for (const group of groups)
        for (const value of group)
            ids.add(value.profileId);
    return ids;
}
export function rebindSingleProfileBackup(data, target) {
    const ids = sourceProfileIds(data);
    if (ids.size !== 1)
        throw new TypeError('O backup deve conter exatamente um perfil para restauração local segura.');
    const sourceId = [...ids][0];
    if (!sourceId)
        throw new TypeError('Backup sem perfil de origem.');
    const remap = (items) => items.map((item) => ({ ...item, profileId: target.id }));
    const sourceProfile = data.profiles[0];
    if (!sourceProfile)
        throw new TypeError('Backup sem perfil de origem.');
    return {
        profiles: [{ ...sourceProfile, id: target.id, updatedAt: new Date().toISOString() }],
        accounts: remap(data.accounts),
        transactions: remap(data.transactions),
        creditCards: remap(data.creditCards),
        debts: remap(data.debts),
        assets: remap(data.assets),
        allocations: remap(data.allocations),
        recurrences: remap(data.recurrences),
        recurrenceMonths: remap(data.recurrenceMonths),
        investmentInstruments: remap(data.investmentInstruments),
        investmentTrades: remap(data.investmentTrades)
    };
}
