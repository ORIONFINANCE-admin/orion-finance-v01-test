import { APP_VERSION } from './version.js';
import { loadRuntimeConfig } from '../config/runtime.js';
import { IndexedDbAccountRepository, IndexedDbAllocationRepository, IndexedDbAssetRepository, IndexedDbCreditCardRepository, IndexedDbDebtRepository, IndexedDbProfileRepository, IndexedDbRecurrenceMonthRepository, IndexedDbRecurrenceRepository, IndexedDbTransactionRepository, IndexedDbInvestmentInstrumentRepository, IndexedDbInvestmentTradeRepository } from '../data/indexeddb/repositories.js';
import { IndexedDbTransactionMutationGateway } from '../data/indexeddb/transaction-mutations.js';
import { IndexedDbEntityLifecycleMutationGateway } from '../data/indexeddb/entity-lifecycle-mutations.js';
import { IndexedDbMarketDataCache } from '../data/indexeddb/market-cache.js';
import { IndexedDbMetadataRepository } from '../data/indexeddb/metadata.js';
import { clear } from '../ui/dom.js';
import { createShell } from '../ui/shell.js';
import { renderHome } from '../ui/screens/home.js';
import { renderMovements } from '../ui/screens/movements.js';
import { renderPlanning } from '../ui/screens/planning.js';
import { renderAccounts } from '../ui/screens/accounts.js';
import { renderInvestments } from '../ui/screens/investments.js';
import { renderSettings } from '../ui/screens/settings.js';
import { showOnboarding } from '../ui/screens/onboarding.js';
import { openNewTransactionSheet } from '../ui/screens/new-transaction.js';
import { showActionToast, showToast } from '../ui/components/feedback.js';
import { bindConnectivityStatus } from '../ui/components/system-status.js';
import { errorState, fatalState, loadingState } from '../ui/components/states.js';
import { recordDiagnostic } from '../diagnostics/session-log.js';
import { LocalIdentityProvider } from '../identity/session.js';
import { WebPlatformRuntime } from '../platform/web-runtime.js';
import { registerPwaUpdateFlow } from '../platform/pwa-update.js';
import { HttpMarketGatewayProvider } from '../infrastructure/market-data/http-gateway-provider.js';
import { checkGatewayHealth } from '../infrastructure/market-data/gateway-health.js';
import { ResilientMarketDataGateway } from '../application/market-data/resilient-gateway.js';
import { MarketRefreshCoordinator } from '../application/market-data/refresh-coordinator.js';
import { FundamentalRefreshCoordinator } from '../application/market-data/fundamental-refresh-coordinator.js';
const platformRuntime = new WebPlatformRuntime();
const marketDataCache = new IndexedDbMarketDataCache();
document.documentElement.classList.toggle('pwa-standalone', platformRuntime.isStandalone());
const repositories = {
    profiles: new IndexedDbProfileRepository(),
    accounts: new IndexedDbAccountRepository(),
    transactions: new IndexedDbTransactionRepository(),
    creditCards: new IndexedDbCreditCardRepository(),
    debts: new IndexedDbDebtRepository(),
    assets: new IndexedDbAssetRepository(),
    allocations: new IndexedDbAllocationRepository(),
    recurrences: new IndexedDbRecurrenceRepository(),
    recurrenceMonths: new IndexedDbRecurrenceMonthRepository(),
    investmentInstruments: new IndexedDbInvestmentInstrumentRepository(),
    investmentTrades: new IndexedDbInvestmentTradeRepository(),
    marketDataCache
};
const transactionMutations = new IndexedDbTransactionMutationGateway();
const entityLifecycle = new IndexedDbEntityLifecycleMutationGateway();
const identityProvider = new LocalIdentityProvider(repositories);
async function start() {
    const host = document.querySelector('#app');
    if (!host)
        throw new Error('Elemento raiz do aplicativo não encontrado.');
    host.replaceChildren(loadingState());
    bindConnectivityStatus();
    const runtimeConfigPromise = loadRuntimeConfig();
    const session = await identityProvider.getSession();
    let profile = session.profile;
    let route = 'home';
    let rendering = false;
    let marketCoordinator = null;
    let fundamentalCoordinator = null;
    const shell = createShell(profile, (next) => { route = next; void render(); }, () => {
        void openNewTransactionSheet(repositories, profile, () => void render());
    });
    host.replaceChildren(shell.shell);
    const applyProfile = (next) => {
        profile = next;
        shell.setProfile(next);
        void render();
    };
    async function render() {
        if (rendering)
            return;
        rendering = true;
        shell.setActiveRoute(route);
        try {
            let screen;
            if (route === 'home')
                screen = await renderHome(repositories, profile, {
                    onOpenAccounts: () => { route = 'accounts'; void render(); },
                    onOpenPlanning: () => { route = 'planning'; void render(); }
                });
            else if (route === 'movements')
                screen = await renderMovements(repositories, profile, transactionMutations, () => void render());
            else if (route === 'planning')
                screen = await renderPlanning(repositories, profile, entityLifecycle, () => void render(), () => { route = 'investments'; void render(); });
            else if (route === 'investments')
                screen = await renderInvestments(repositories, marketDataCache, profile, {
                    onBack: () => { route = 'planning'; void render(); },
                    onChanged: () => void render(),
                    onRefreshMarket: marketCoordinator && fundamentalCoordinator ? async () => {
                        const [quotes, fundamentals] = await Promise.all([
                            marketCoordinator.refreshIfDue(true),
                            fundamentalCoordinator.refreshIfDue(true)
                        ]);
                        if (!quotes && !fundamentals)
                            return 'Sem conexão para atualizar';
                        const quoteSummary = quotes ? `cotações ${quotes.fresh} novas · ${quotes.cached} cache` : 'cotações sem alteração';
                        const fundamentalSummary = fundamentals
                            ? `fundamentos ${fundamentals.fresh} novos · ${fundamentals.cached} cache · ${fundamentals.unsupported} n/a`
                            : 'fundamentos sem alteração';
                        return `${quoteSummary} · ${fundamentalSummary}`;
                    } : null
                });
            else if (route === 'accounts')
                screen = await renderAccounts(repositories, profile, entityLifecycle, () => void render());
            else
                screen = await renderSettings(repositories, profile, applyProfile, () => void render());
            clear(shell.content);
            shell.content.append(screen);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido.';
            recordDiagnostic('SCREEN_RENDER', 'error');
            clear(shell.content);
            shell.content.append(errorState('Não foi possível carregar esta área.', message, () => void render()));
        }
        finally {
            rendering = false;
        }
    }
    await render();
    if (!profile.onboardingCompletedAt) {
        showOnboarding(repositories, profile, { onComplete: applyProfile, onDataChanged: () => void render() });
    }
    const runtimeConfig = await runtimeConfigPromise;
    if (runtimeConfig.marketGatewayUrl) {
        const health = await checkGatewayHealth(runtimeConfig.marketGatewayUrl);
        recordDiagnostic('MARKET_GATEWAY_HEALTH', health.status === 'healthy' ? 'info' : 'warning', { status: health.status });
        const remoteProvider = new HttpMarketGatewayProvider(runtimeConfig.marketGatewayUrl);
        const marketGateway = new ResilientMarketDataGateway([remoteProvider], marketDataCache, {
            quoteMaxAgeMs: 36 * 60 * 60 * 1000,
            fundamentalsMaxAgeMs: 7 * 24 * 60 * 60 * 1000
        });
        const metadata = new IndexedDbMetadataRepository();
        marketCoordinator = new MarketRefreshCoordinator(repositories.investmentInstruments, marketGateway, metadata, platformRuntime, profile.id, { maxAgeMs: 24 * 60 * 60 * 1000 });
        fundamentalCoordinator = new FundamentalRefreshCoordinator(repositories.investmentInstruments, marketGateway, metadata, platformRuntime, profile.id, { maxAgeMs: 72 * 60 * 60 * 1000 });
        marketCoordinator.bindLifecycle();
        fundamentalCoordinator.bindLifecycle();
        void marketCoordinator.refreshIfDue().then((result) => {
            if (result)
                recordDiagnostic('MARKET_REFRESH', 'info', { fresh: result.fresh, cached: result.cached, unavailable: result.unavailable });
        }).catch(() => recordDiagnostic('MARKET_REFRESH_FAILED', 'warning'));
        void fundamentalCoordinator.refreshIfDue().then((result) => {
            if (result)
                recordDiagnostic('FUNDAMENTAL_REFRESH', 'info', { fresh: result.fresh, cached: result.cached, unsupported: result.unsupported, unavailable: result.unavailable });
        }).catch(() => recordDiagnostic('FUNDAMENTAL_REFRESH_FAILED', 'warning'));
    }
    const registration = await registerPwaUpdateFlow({
        onUpdateReady: (applyUpdate) => showActionToast('Uma atualização do Orion está pronta.', 'Atualizar', applyUpdate),
        onError: () => {
            recordDiagnostic('PWA_SW_REGISTER', 'warning');
            showToast('Offline indisponível nesta sessão.', 'error');
        }
    });
    if (registration)
        platformRuntime.onResume(() => { void registration.update().catch(() => undefined); });
    document.documentElement.dataset.orionVersion = APP_VERSION;
}
window.addEventListener('unhandledrejection', () => {
    recordDiagnostic('UNHANDLED_REJECTION', 'error');
});
window.addEventListener('error', () => recordDiagnostic('WINDOW_ERROR', 'error'));
void start().catch((error) => {
    const message = error instanceof Error ? error.message : 'Erro desconhecido.';
    recordDiagnostic('APP_BOOT', 'error');
    const host = document.querySelector('#app');
    if (host)
        host.replaceChildren(fatalState(message));
});
