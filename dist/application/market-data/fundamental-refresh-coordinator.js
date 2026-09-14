import { refreshPortfolioFundamentals } from './refresh-fundamentals.js';
function keyFor(profileId) {
    return `profile:${profileId}:fundamentals:last_refresh_at`;
}
export class FundamentalRefreshCoordinator {
    instruments;
    gateway;
    metadata;
    runtime;
    profileId;
    options;
    running = null;
    constructor(instruments, gateway, metadata, runtime, profileId, options) {
        this.instruments = instruments;
        this.gateway = gateway;
        this.metadata = metadata;
        this.runtime = runtime;
        this.profileId = profileId;
        this.options = options;
    }
    async refreshIfDue(force = false) {
        if (!this.runtime.isOnline())
            return null;
        if (this.running)
            return this.running;
        const now = this.options.now?.() ?? new Date();
        if (!force) {
            const previous = await this.metadata.get(keyFor(this.profileId));
            const previousMs = previous ? Date.parse(previous) : Number.NaN;
            if (Number.isFinite(previousMs) && now.getTime() - previousMs < this.options.maxAgeMs)
                return null;
        }
        this.running = refreshPortfolioFundamentals(this.instruments, this.gateway, this.profileId, now)
            .then(async (result) => {
            if (result.fresh > 0 || result.attempted === 0)
                await this.metadata.set(keyFor(this.profileId), now.toISOString());
            return result;
        })
            .finally(() => { this.running = null; });
        return this.running;
    }
    bindLifecycle() {
        const offResume = this.runtime.onResume(() => { void this.refreshIfDue(); });
        const offOnline = this.runtime.onOnline(() => { void this.refreshIfDue(); });
        return () => { offResume(); offOnline(); };
    }
}
