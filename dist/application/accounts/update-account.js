export async function updateAccountDetails(repository, gateway, input) {
    const current = await repository.getById(input.accountId);
    if (!current || current.profileId !== input.profileId)
        throw new TypeError('Conta não encontrada para o perfil ativo.');
    if (!current.active)
        throw new TypeError('Conta desativada não pode ser editada.');
    const name = input.name.trim();
    if (!name)
        throw new TypeError('Informe um nome para a conta.');
    return gateway.update(input.profileId, 'account', {
        ...current,
        name,
        institutionId: input.institutionId,
        type: input.type,
        color: input.color,
        includeInAvailable: input.includeInAvailable
    });
}
