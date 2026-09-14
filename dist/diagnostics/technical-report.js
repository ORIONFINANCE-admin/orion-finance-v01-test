import { APP_VERSION, DATA_SCHEMA_VERSION } from '../app/version.js';
import { inspectLocalDatabase } from '../data/indexeddb/health.js';
import { checkGatewayHealth } from '../infrastructure/market-data/gateway-health.js';
import { collectDeviceDiagnostics } from '../platform/device-diagnostics.js';
import { listDiagnostics } from './session-log.js';
export async function createTechnicalReport(runtimeConfig) {
    const [database, marketGateway] = await Promise.all([
        inspectLocalDatabase(),
        checkGatewayHealth(runtimeConfig.marketGatewayUrl)
    ]);
    return {
        format: 'orion-technical-report-v1',
        generatedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        dataSchemaVersion: DATA_SCHEMA_VERSION,
        device: collectDeviceDiagnostics(),
        database,
        marketGateway,
        recentDiagnostics: listDiagnostics(),
        privacy: { containsFinancialValues: false, containsProfileIdentity: false }
    };
}
export function serializeTechnicalReport(report) {
    return JSON.stringify(report, null, 2);
}
