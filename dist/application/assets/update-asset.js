export async function updateAssetDetails(repository, gateway, input) {
    const current = await repository.getById(input.assetId);
    if (!current || current.profileId !== input.profileId || !current.active)
        throw new TypeError('Ativo não encontrado para o perfil ativo.');
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe o nome do ativo.');
    return gateway.update(input.profileId, 'asset', {
        ...current,
        name,
        liquidity: input.liquidity,
        includeInNetWorth: input.includeInNetWorth,
        policyId: input.policyId?.trim() || undefined
    });
}
