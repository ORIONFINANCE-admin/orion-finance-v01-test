const FREE_CAPABILITIES = new Set([
    'core-finance',
    'planning',
    'investments',
    'investment-radar',
    'market-data-essential',
    'backup-export',
    'backup-restore'
]);
const PREMIUM_ONLY = new Set([
    'ai-assistant',
    'smart-import',
    'cloud-sync',
    'advanced-alerts',
    'advanced-reports'
]);
export function capabilitiesForPlan(plan) {
    if (plan === 'premium' || plan === 'personal')
        return new Set([...FREE_CAPABILITIES, ...PREMIUM_ONLY]);
    return new Set(FREE_CAPABILITIES);
}
export function hasCapability(plan, capability) {
    return capabilitiesForPlan(plan).has(capability);
}
export function isCoreDataCapability(capability) {
    return capability === 'core-finance' || capability === 'backup-export' || capability === 'backup-restore';
}
