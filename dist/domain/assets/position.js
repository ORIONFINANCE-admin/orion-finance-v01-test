import { addCents, subtractCents, ZERO_CENTS } from '../money/money.js';
export function calculateAssetPosition(asset, transactions) {
    let contributed = ZERO_CENTS;
    let withdrawn = ZERO_CENTS;
    let consumedAsGuarantee = ZERO_CENTS;
    let realizedYield = ZERO_CENTS;
    let valuationDelta = ZERO_CENTS;
    for (const transaction of transactions) {
        if ('assetId' in transaction && transaction.assetId === asset.id) {
            if (transaction.kind === 'asset-contribution')
                contributed = addCents(contributed, transaction.amount);
            else if (transaction.kind === 'asset-withdrawal')
                withdrawn = addCents(withdrawn, transaction.amount);
            else if (transaction.kind === 'asset-yield')
                realizedYield = addCents(realizedYield, transaction.amount);
            else if (transaction.kind === 'asset-valuation')
                valuationDelta = addCents(valuationDelta, transaction.amount);
        }
        if (transaction.kind === 'credit-card-payment' &&
            transaction.source.kind === 'guarantee-asset' &&
            transaction.source.assetId === asset.id) {
            consumedAsGuarantee = addCents(consumedAsGuarantee, transaction.amount);
        }
    }
    const gross = addCents(addCents(addCents(asset.openingValue, contributed), realizedYield), valuationDelta);
    const afterWithdrawals = subtractCents(gross, withdrawn);
    return {
        currentValue: subtractCents(afterWithdrawals, consumedAsGuarantee),
        contributed,
        withdrawn,
        consumedAsGuarantee,
        realizedYield,
        valuationDelta
    };
}
