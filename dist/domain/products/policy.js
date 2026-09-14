export function isPolicyEffective(policy, onDate) {
    if (onDate < policy.validFrom)
        return false;
    return policy.validUntil === undefined || onDate <= policy.validUntil;
}
