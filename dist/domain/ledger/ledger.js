import { addCents, cents, subtractCents, ZERO_CENTS } from '../money/money.js';
export class DomainInvariantError extends Error {
    name = 'DomainInvariantError';
}
function requireAccount(balances, accountId) {
    const value = balances.get(accountId);
    if (value === undefined)
        throw new DomainInvariantError(`Conta inexistente: ${accountId}`);
    return value;
}
export function calculateCashBalances(accounts, transactions, investmentTrades = []) {
    const balances = new Map(accounts.map((account) => [account.id, account.openingBalance]));
    for (const transaction of transactions) {
        switch (transaction.kind) {
            case 'income':
            case 'yield': {
                const current = requireAccount(balances, transaction.accountId);
                balances.set(transaction.accountId, addCents(current, transaction.amount));
                break;
            }
            case 'expense': {
                if (transaction.settlement.kind === 'account') {
                    const accountId = transaction.settlement.accountId;
                    const current = requireAccount(balances, accountId);
                    balances.set(accountId, subtractCents(current, transaction.amount));
                }
                break;
            }
            case 'transfer': {
                if (transaction.fromAccountId === transaction.toAccountId) {
                    throw new DomainInvariantError('Transferência exige contas de origem e destino diferentes.');
                }
                const from = requireAccount(balances, transaction.fromAccountId);
                const to = requireAccount(balances, transaction.toAccountId);
                balances.set(transaction.fromAccountId, subtractCents(from, transaction.amount));
                balances.set(transaction.toAccountId, addCents(to, transaction.amount));
                break;
            }
            case 'credit-card-payment': {
                if (transaction.source.kind === 'account') {
                    const current = requireAccount(balances, transaction.source.accountId);
                    balances.set(transaction.source.accountId, subtractCents(current, transaction.amount));
                }
                break;
            }
            case 'debt-payment': {
                const current = requireAccount(balances, transaction.accountId);
                balances.set(transaction.accountId, subtractCents(current, transaction.amount));
                break;
            }
            case 'asset-contribution': {
                const current = requireAccount(balances, transaction.accountId);
                balances.set(transaction.accountId, subtractCents(current, transaction.amount));
                break;
            }
            case 'asset-withdrawal': {
                const current = requireAccount(balances, transaction.accountId);
                balances.set(transaction.accountId, addCents(current, transaction.amount));
                break;
            }
            case 'asset-yield':
            case 'asset-valuation':
                break;
            default: {
                const exhaustive = transaction;
                return exhaustive;
            }
        }
    }
    for (const trade of investmentTrades) {
        const current = requireAccount(balances, trade.settlementAccountId);
        if (trade.side === 'buy') {
            balances.set(trade.settlementAccountId, subtractCents(current, addCents(trade.grossAmount, trade.fees)));
        }
        else {
            if (trade.fees > trade.grossAmount)
                throw new DomainInvariantError('Taxas de venda excedem o valor bruto.');
            balances.set(trade.settlementAccountId, addCents(current, subtractCents(trade.grossAmount, trade.fees)));
        }
    }
    return balances;
}
export function calculatePeriodSummary(transactions) {
    let income = ZERO_CENTS;
    let assetYield = ZERO_CENTS;
    let expenseRecognized = ZERO_CENTS;
    let debtPayments = ZERO_CENTS;
    let creditCardPaymentsFromCash = ZERO_CENTS;
    let assetContributions = ZERO_CENTS;
    let assetWithdrawals = ZERO_CENTS;
    let cashInflow = ZERO_CENTS;
    let cashOutflow = ZERO_CENTS;
    for (const transaction of transactions) {
        switch (transaction.kind) {
            case 'income':
            case 'yield':
                income = addCents(income, transaction.amount);
                cashInflow = addCents(cashInflow, transaction.amount);
                break;
            case 'asset-yield':
                assetYield = addCents(assetYield, transaction.amount);
                income = addCents(income, transaction.amount);
                break;
            case 'expense':
                expenseRecognized = addCents(expenseRecognized, transaction.amount);
                if (transaction.settlement.kind === 'account')
                    cashOutflow = addCents(cashOutflow, transaction.amount);
                break;
            case 'credit-card-payment':
                if (transaction.source.kind === 'account') {
                    creditCardPaymentsFromCash = addCents(creditCardPaymentsFromCash, transaction.amount);
                    cashOutflow = addCents(cashOutflow, transaction.amount);
                }
                break;
            case 'debt-payment':
                debtPayments = addCents(debtPayments, transaction.amount);
                cashOutflow = addCents(cashOutflow, transaction.amount);
                break;
            case 'asset-contribution':
                assetContributions = addCents(assetContributions, transaction.amount);
                cashOutflow = addCents(cashOutflow, transaction.amount);
                break;
            case 'asset-withdrawal':
                assetWithdrawals = addCents(assetWithdrawals, transaction.amount);
                cashInflow = addCents(cashInflow, transaction.amount);
                break;
            case 'asset-valuation':
            case 'transfer':
                break;
            default: {
                const exhaustive = transaction;
                return exhaustive;
            }
        }
    }
    return {
        income,
        assetYield,
        expenseRecognized,
        operatingResult: subtractCents(income, expenseRecognized),
        debtPayments,
        creditCardPaymentsFromCash,
        assetContributions,
        assetWithdrawals,
        cashInflow,
        cashOutflow
    };
}
export function totalCash(balances) {
    let total = ZERO_CENTS;
    for (const balance of balances.values())
        total = addCents(total, balance);
    return cents(total);
}
