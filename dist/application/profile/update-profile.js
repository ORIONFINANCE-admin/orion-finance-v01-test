export async function updateProfileIdentity(repository, current, input) {
    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 60)
        throw new RangeError('Informe um nome entre 2 e 60 caracteres.');
    const now = new Date().toISOString();
    const updated = {
        ...current,
        displayName,
        locale: current.locale ?? 'pt-BR',
        baseCurrency: current.baseCurrency ?? 'BRL',
        updatedAt: now,
        ...(input.completeOnboarding && !current.onboardingCompletedAt ? { onboardingCompletedAt: now } : {})
    };
    await repository.save(updated);
    return updated;
}
