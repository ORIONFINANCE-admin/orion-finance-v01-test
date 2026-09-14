import { addCents, maxCents, subtractCents, ZERO_CENTS } from '../money/money.js';
export function calculateAllocationPosition(accountId, accountBalance, allocations) {
    let allocated = ZERO_CENTS;
    let protectedAmount = ZERO_CENTS;
    for (const item of allocations) {
        if (!item.active || item.accountId !== accountId)
            continue;
        allocated = addCents(allocated, item.amount);
        if (item.protected)
            protectedAmount = addCents(protectedAmount, item.amount);
    }
    return {
        allocated,
        protectedAmount,
        unallocated: maxCents(subtractCents(accountBalance, allocated), ZERO_CENTS),
        overAllocated: maxCents(subtractCents(allocated, accountBalance), ZERO_CENTS)
    };
}
