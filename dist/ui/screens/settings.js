import { APP_VERSION, DATA_SCHEMA_VERSION } from '../../app/version.js';
import { updateProfileIdentity } from '../../application/profile/update-profile.js';
import { loadRuntimeConfig } from '../../config/runtime.js';
import { createProfileBackup } from '../../data/backup/profile.js';
import { serializeBackup } from '../../data/backup/model.js';
import { parseBackup } from '../../data/backup/validate.js';
import { rebindSingleProfileBackup } from '../../data/backup/rebind.js';
import { replaceProfileDataAtomically } from '../../data/backup/restore.js';
import { readJsonDocument } from '../../data/import/json-document.js';
import { applyPreparedLegacyMigration, prepareLegacyMigration } from '../../migration/legacy/apply.js';
import { listDiagnostics } from '../../diagnostics/session-log.js';
import { createTechnicalReport, serializeTechnicalReport } from '../../diagnostics/technical-report.js';
import { checkGatewayHealth } from '../../infrastructure/market-data/gateway-health.js';
import { capabilitiesForPlan } from '../../product/capabilities.js';
import { DEFAULT_PRIVACY_SUMMARY, MARKET_DATA_DISCLOSURE } from '../../privacy/remote-disclosure.js';
import { el, button } from '../dom.js';
import { labeledField, textField } from '../components/fields.js';
import { showConfirmation } from '../components/sheets.js';
import { showToast } from '../components/feedback.js';
import { downloadTextFile } from '../download.js';
function standaloneMode() {
    const nav = navigator;
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}
function gatewayLabel(status) {
    if (status === 'healthy')
        return 'Online';
    if (status === 'unavailable')
        return 'Indisponível';
    return 'Não configurado';
}
export async function renderSettings(repositories, profile, onProfileChanged, onDataChanged) {
    const [runtimeConfig, diagnostics] = await Promise.all([loadRuntimeConfig(), Promise.resolve(listDiagnostics())]);
    const gatewayHealth = await checkGatewayHealth(runtimeConfig.marketGatewayUrl);
    const root = el('div', 'screen settings-screen', [
        el('div', 'screen-heading', [el('div', '', [el('h1', '', ['Conta e dados']), el('p', '', ['Perfil, backup, ambiente e diagnóstico do Orion.'])])])
    ]);
    const nameInput = textField('Nome', profile.displayName);
    const profileCard = el('section', 'settings-card', [
        el('div', 'settings-card-heading', [el('h2', '', ['Perfil']), el('span', 'settings-badge', ['LOCAL'])]),
        labeledField('Como o Orion deve chamar você', nameInput),
        button('btn primary full', 'Salvar perfil', () => {
            void updateProfileIdentity(repositories.profiles, profile, { displayName: nameInput.value, completeOnboarding: true })
                .then((updated) => { onProfileChanged(updated); showToast('Perfil atualizado.', 'success'); })
                .catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao atualizar perfil.', 'error'));
        })
    ]);
    const exportButton = button('btn secondary full', 'Exportar backup', () => {
        void createProfileBackup(repositories, profile).then((backup) => {
            const day = new Date().toISOString().slice(0, 10);
            downloadTextFile(`orion-backup-${day}.json`, serializeBackup(backup));
            showToast('Backup preparado.', 'success');
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao exportar backup.', 'error'));
    });
    const fileInput = el('input', 'visually-hidden');
    fileInput.type = 'file';
    fileInput.accept = '.json,.zip,application/json,application/zip';
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file)
            return;
        void readJsonDocument(file).then((raw) => {
            const parsed = parseBackup(raw);
            const rebound = rebindSingleProfileBackup(parsed.data, profile);
            showConfirmation('Restaurar backup?', 'Os dados financeiros deste perfil serão substituídos de forma atômica. O cache de mercado e outros perfis não serão apagados.', 'Restaurar', () => {
                void replaceProfileDataAtomically(profile.id, rebound).then(() => {
                    showToast('Backup restaurado com segurança.', 'success');
                    onDataChanged();
                }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao restaurar backup.', 'error'));
            });
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Backup inválido.', 'error'));
        fileInput.value = '';
    });
    const legacyInput = el('input', 'visually-hidden');
    legacyInput.type = 'file';
    legacyInput.accept = '.json,.zip,application/json,application/zip';
    legacyInput.addEventListener('change', () => {
        const file = legacyInput.files?.[0];
        if (!file)
            return;
        void readJsonDocument(file).then(async (raw) => {
            const prepared = await prepareLegacyMigration(raw, profile.id);
            const counts = prepared.report.counts;
            const summary = `${counts.accounts ?? 0} contas · ${counts.transactions ?? 0} movimentações · ${counts.debts ?? 0} dívidas · ${prepared.report.warnings.length} avisos.`;
            showConfirmation('Migrar Orion anterior?', `O backup legado foi convertido e validado. ${summary} Antes da migração será exportada uma cópia da base atual. Snapshots antigos não serão tratados como autoridade.`, 'Migrar com segurança', () => {
                void createProfileBackup(repositories, profile).then(async (currentBackup) => {
                    const stamp = new Date().toISOString().slice(0, 10);
                    downloadTextFile(`orion-pre-migracao-${stamp}.json`, serializeBackup(currentBackup));
                    await applyPreparedLegacyMigration(prepared, profile.id);
                    const migratedProfile = prepared.data.profiles[0];
                    if (migratedProfile)
                        onProfileChanged(migratedProfile);
                    onDataChanged();
                    showToast('Migração concluída e auditada.', 'success');
                }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha na migração.', 'error'));
            });
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Backup legado incompatível.', 'error'));
        legacyInput.value = '';
    });
    const dataCard = el('section', 'settings-card', [
        el('div', 'settings-card-heading', [el('h2', '', ['Seus dados'])]),
        el('p', 'settings-help', ['Backup, restauração e exportação pertencem ao usuário e não dependem de plano futuro.']),
        exportButton,
        button('btn secondary full', 'Restaurar backup v0.1', () => fileInput.click()),
        button('btn secondary full', 'Migrar Orion anterior (JSON/ZIP)', () => legacyInput.click()),
        fileInput,
        legacyInput
    ]);
    const capabilities = capabilitiesForPlan('personal');
    const technicalReportButton = button('btn secondary full', 'Executar diagnóstico do dispositivo', () => {
        technicalReportButton.disabled = true;
        technicalReportButton.textContent = 'Verificando…';
        void createTechnicalReport(runtimeConfig).then((report) => {
            const databaseLabel = report.database.status === 'healthy' ? 'Banco local OK' : 'Banco local requer atenção';
            const pwaLabel = report.device.standalone ? 'PWA standalone' : 'Navegador';
            showToast(`${databaseLabel} · ${pwaLabel} · SW ${report.device.serviceWorker.controlled ? 'ativo' : 'não controlado'}.`, report.database.status === 'healthy' ? 'success' : 'error');
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha no diagnóstico.', 'error')).finally(() => {
            technicalReportButton.disabled = false;
            technicalReportButton.textContent = 'Executar diagnóstico do dispositivo';
        });
    });
    const exportTechnicalReportButton = button('btn secondary full', 'Exportar relatório técnico', () => {
        exportTechnicalReportButton.disabled = true;
        void createTechnicalReport(runtimeConfig).then((report) => {
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadTextFile(`orion-diagnostico-${stamp}.json`, serializeTechnicalReport(report));
            showToast('Relatório técnico exportado sem valores financeiros ou identidade do perfil.', 'success');
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao exportar diagnóstico.', 'error')).finally(() => {
            exportTechnicalReportButton.disabled = false;
        });
    });
    const diagnosticsCard = el('section', 'settings-card', [
        el('div', 'settings-card-heading', [el('h2', '', ['Diagnóstico'])]),
        el('div', 'diagnostic-grid', [
            el('div', '', [el('small', '', ['Versão']), el('strong', '', [APP_VERSION])]),
            el('div', '', [el('small', '', ['Schema']), el('strong', '', [String(DATA_SCHEMA_VERSION)])]),
            el('div', '', [el('small', '', ['Ambiente']), el('strong', '', [standaloneMode() ? 'PWA standalone' : 'Navegador'])]),
            el('div', '', [el('small', '', ['Conexão']), el('strong', '', [navigator.onLine ? 'Online' : 'Offline'])]),
            el('div', '', [el('small', '', ['Market Gateway']), el('strong', '', [gatewayLabel(gatewayHealth.status)])]),
            el('div', '', [el('small', '', ['Capabilities']), el('strong', '', [String(capabilities.size)])]),
            el('div', '', [el('small', '', ['Eventos da sessão']), el('strong', '', [String(diagnostics.length)])]),
            el('div', '', [el('small', '', ['Configuração']), el('strong', '', [runtimeConfig.source === 'default' ? 'Local' : runtimeConfig.source])])
        ]),
        el('p', 'settings-help', ['O diagnóstico local não envia dados financeiros. Market data é opcional e o Orion continua funcional sem gateway.']),
        technicalReportButton,
        exportTechnicalReportButton,
        el('p', 'settings-help', ['O relatório inclui apenas ambiente técnico, viewport/safe-area, service worker, integridade do banco local e eventos técnicos recentes. Nome, saldos, contas e movimentações não são exportados.'])
    ]);
    const privacyCard = el('section', 'settings-card', [
        el('div', 'settings-card-heading', [el('h2', '', ['Privacidade']), el('span', 'settings-badge', ['LOCAL-FIRST'])]),
        el('p', 'settings-help', [DEFAULT_PRIVACY_SUMMARY.storage]),
        el('p', 'settings-help', [DEFAULT_PRIVACY_SUMMARY.telemetry]),
        el('p', 'settings-help', [DEFAULT_PRIVACY_SUMMARY.marketData]),
        el('p', 'settings-help', [`Gateway de mercado envia: ${MARKET_DATA_DISCLOSURE.fieldsSent.join(', ')}. Não envia perfil, saldos, quantidade, preço médio, movimentações ou dívidas.`]),
        el('p', 'settings-help', [DEFAULT_PRIVACY_SUMMARY.ai])
    ]);
    const installCard = el('section', 'settings-card', [
        el('div', 'settings-card-heading', [el('h2', '', ['Instalação'])]),
        el('p', 'settings-help', [standaloneMode()
                ? 'O Orion está aberto como PWA instalado. Safe areas e navegação usam o perfil standalone do dispositivo.'
                : 'No iPhone, abra pelo Safari e use Compartilhar → Adicionar à Tela de Início → Abrir como App da Web.'])
    ]);
    root.append(profileCard, dataCard, privacyCard, diagnosticsCard, installCard);
    return root;
}
