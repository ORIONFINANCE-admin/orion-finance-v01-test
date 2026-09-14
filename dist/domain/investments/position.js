import { cents } from '../money/money.js';
import { QUANTITY_SCALE } from './models.js';
import { quantityUnits } from './quantity.js';
function roundRatioHalfUp(numerator, denominator) {
    if (denominator <= 0n)
        throw new RangeError('Divisor inválido.');
    if (numerator < 0n)
        return -roundRatioHalfUp(-numerator, denominator);
    const quotient = numerator / denominator;
    const remainder = numerator % denominator;
    return quotient + (remainder * 2n >= denominator ? 1n : 0n);
}
export function calculateInvestmentPosition(instrumentId, trades) {
    let quantity = 0;
    let costBasis = 0;
    let realized = 0;
    const ordered = trades
        .filter((trade) => trade.instrumentId === instrumentId)
        .slice()
        .sort((left, right) => left.date.localeCompare(right.date) || (left.createdAt ?? '').localeCompare(right.createdAt ?? ''));
    for (const trade of ordered) {
        if (trade.quantity <= 0)
            throw new RangeError('Negociação deve possuir quantidade positiva.');
        if (trade.grossAmount < 0 || trade.fees < 0)
            throw new RangeError('Valores de negociação não podem ser negativos.');
        if (trade.side === 'buy') {
            quantity += trade.quantity;
            if (!Number.isSafeInteger(quantity))
                throw new RangeError('Quantidade acumulada excede limite seguro.');
            costBasis += trade.grossAmount + trade.fees;
            if (!Number.isSafeInteger(costBasis))
                throw new RangeError('Custo acumulado excede limite seguro.');
            continue;
        }
        if (trade.quantity > quantity)
            throw new RangeError('Venda excede a posição disponível.');
        const allocatedCost = Number(roundRatioHalfUp(BigInt(costBasis) * BigInt(trade.quantity), BigInt(quantity)));
        const netProceeds = trade.grossAmount - trade.fees;
        realized += netProceeds - allocatedCost;
        costBasis -= allocatedCost;
        quantity -= trade.quantity;
        if (quantity === 0)
            costBasis = 0;
    }
    return { instrumentId, quantity: quantityUnits(quantity), costBasis: cents(costBasis), realizedGainLoss: cents(realized) };
}
export function marketValueForPosition(quantity, quotePrice) {
    const result = roundRatioHalfUp(BigInt(quantity) * BigInt(quotePrice), BigInt(QUANTITY_SCALE));
    const value = Number(result);
    if (!Number.isSafeInteger(value))
        throw new RangeError('Valor de mercado excede limite seguro.');
    return cents(value);
}
export function unrealizedGainLoss(position, quotePrice) {
    return cents(marketValueForPosition(position.quantity, quotePrice) - position.costBasis);
}
