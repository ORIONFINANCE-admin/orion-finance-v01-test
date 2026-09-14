import { addCents, cents, subtractCents, ZERO_CENTS } from '../money/money.js';
import { calculateInterest } from '../rates/rate.js';
export function projectDebtByFullMonths(principal, monthlyRate, fullMonths) {
    if (!Number.isSafeInteger(fullMonths) || fullMonths < 0) {
        throw new RangeError('Quantidade de meses inválida.');
    }
    let balance = principal;
    let totalInterest = ZERO_CENTS;
    for (let month = 0; month < fullMonths; month += 1) {
        const interest = calculateInterest(balance, monthlyRate);
        balance = addCents(balance, interest);
        totalInterest = addCents(totalInterest, interest);
    }
    return { endingBalance: balance, totalInterest };
}
export function simulateFixedMonthlyPayment(principal, monthlyRate, payment, maxMonths = 600) {
    if (principal <= 0)
        return { status: 'paid', months: 0, totalPaid: ZERO_CENTS, totalInterest: ZERO_CENTS };
    if (payment <= 0)
        throw new RangeError('Pagamento mensal deve ser maior que zero.');
    if (!Number.isSafeInteger(maxMonths) || maxMonths <= 0)
        throw new RangeError('Limite de meses inválido.');
    const firstMonthInterest = calculateInterest(principal, monthlyRate);
    if (payment <= firstMonthInterest)
        return { status: 'non-amortizing', firstMonthInterest };
    let balance = principal;
    let totalPaid = ZERO_CENTS;
    let totalInterest = ZERO_CENTS;
    for (let month = 1; month <= maxMonths; month += 1) {
        const interest = calculateInterest(balance, monthlyRate);
        totalInterest = addCents(totalInterest, interest);
        balance = addCents(balance, interest);
        const actualPayment = payment >= balance ? balance : payment;
        balance = subtractCents(balance, actualPayment);
        totalPaid = addCents(totalPaid, actualPayment);
        if (balance === 0)
            return { status: 'paid', months: month, totalPaid, totalInterest };
    }
    return { status: 'limit-reached', months: maxMonths, remainingBalance: cents(balance) };
}
