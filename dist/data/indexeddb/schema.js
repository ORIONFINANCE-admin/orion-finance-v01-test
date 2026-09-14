import { DATA_SCHEMA_VERSION, DATABASE_NAME } from '../../app/version.js';
export const DB_NAME = DATABASE_NAME;
export const DB_VERSION = DATA_SCHEMA_VERSION;
export const STORES = {
    metadata: 'metadata',
    profiles: 'profiles',
    accounts: 'accounts',
    transactions: 'transactions',
    creditCards: 'credit_cards',
    debts: 'debts',
    assets: 'assets',
    allocations: 'allocations',
    recurrences: 'recurrences',
    recurrenceMonths: 'recurrence_months',
    auditEvents: 'audit_events',
    marketCache: 'market_cache',
    investmentInstruments: 'investment_instruments',
    investmentTrades: 'investment_trades',
    migrationRuns: 'migration_runs',
    providerHealth: 'provider_health'
};
