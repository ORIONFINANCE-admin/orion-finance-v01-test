import { calculateCashBalances, calculatePeriodSummary } from '../../domain/ledger/ledger.js';
import { getFinancialPosition } from '../planning/get-financial-position.js';
import { financialStatusFor } from './financial-status.js';
function monthPrefix(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
export async function getDashboardSnapshot(repositories, profileId, now = new Date()) {
    const [accountsRaw, transactions, investmentTrades, position] = await Promise.all([
        repositories.accounts.listByProfile(profileId),
        repositories.transactions.listByProfile(profileId),
        repositories.investmentTrades.listByProfile(profileId),
        getFinancialPosition(repositories, profileId, now)
    ]);
    const accounts = accountsRaw.filter((account) => account.active);
    const balances = calculateCashBalances(accounts, transactions, investmentTrades);
    const availableNow = position.availableNow;
    const prefix = monthPrefix(now);
    const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(prefix));
    const summary = calculatePeriodSummary(monthTransactions);
    return {
        accounts,
        transactions,
        balances,
        availableNow,
        incomeMonth: summary.income,
        expenseMonth: summary.expenseRecognized,
        resultMonth: summary.operatingResult,
        freeToDecide: position.freeToDecide,
        netWorth: position.netWorth.netWorth,
        plannedExpense: position.commitments.plannedExpense,
        allocated: position.totalAllocated,
        status: financialStatusFor({
            availableNow,
            freeToDecide: position.freeToDecide,
            resultMonth: summary.operatingResult,
            plannedExpense: position.commitments.plannedExpense,
            allocated: position.totalAllocated
        })
    };
}
