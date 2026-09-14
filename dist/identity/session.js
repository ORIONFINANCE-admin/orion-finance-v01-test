import { ensureLocalProfile } from '../application/bootstrap.js';
export class LocalIdentityProvider {
    repositories;
    constructor(repositories) {
        this.repositories = repositories;
    }
    async getSession() {
        const profile = await ensureLocalProfile(this.repositories);
        return {
            subjectId: 'local-device-user',
            profileId: profile.id,
            mode: 'local',
            profile
        };
    }
}
