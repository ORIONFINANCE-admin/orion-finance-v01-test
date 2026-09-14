import { LOCAL_PRIMARY_PROFILE_ID } from '../identity/profile.js';
export async function ensureLocalProfile(repositories) {
    const current = await repositories.profiles.getById(LOCAL_PRIMARY_PROFILE_ID);
    if (current)
        return current;
    const now = new Date().toISOString();
    const profile = {
        id: LOCAL_PRIMARY_PROFILE_ID,
        displayName: 'Usuário',
        locale: 'pt-BR',
        baseCurrency: 'BRL',
        createdAt: now,
        updatedAt: now
    };
    await repositories.profiles.save(profile);
    return profile;
}
