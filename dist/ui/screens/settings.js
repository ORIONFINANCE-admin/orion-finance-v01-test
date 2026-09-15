import { APP_VERSION } from '../../app/version.js';
import { updateProfileIdentity } from '../../application/profile/update-profile.js';
import { loadRuntimeConfig } from '../../config/runtime.js';
import { createProfileBackup } from '../../data/backup/profile.js';
import { serializeBackup } from '../../data/backup/model.js';
import { parseBackup } from '../../data/backup/validate.js';
import { rebindSingleProfileBackup } from '../../data/backup/rebind.js';
import { replaceProfileDataAtomically } from '../../data/backup/restore.js';
import { createFreshProfileData } from '../../data/backup/fresh-profile.js';
import { readJsonDocument } from '../../data/import/json-document.js';
import { applyPreparedLegacyMigration, prepareLegacyMigration } from '../../migration/legacy/apply.js';
import { createTechnicalReport, serializeTechnicalReport } from '../../diagnostics/technical-report.js';
import { el, button } from '../dom.js';
import { icon } from '../icons.js';
import { labeledField, textField } from '../components/fields.js';
import { showConfirmation } from '../components/sheets.js';
import { showToast } from '../components/feedback.js';
import { downloadTextFile } from '../download.js';
function standaloneMode() {
    const nav = navigator;
    return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}
function disclosure(title, support, content) {
    return el('details', 'settings-disclosure', [
        el('summary', 'settings-disclosure-summary', [
            el('span', 'settings-disclosure-copy', [el('strong', '', [title]), el('small', '', [support])]),
            el('span', 'settings-disclosure-chevron', [icon('chevron', 'settings-disclosure-chevron-icon')])
        ]),
        el('div', 'settings-disclosure-content', content)
    ]);
}
export async function renderSettings(repositories, profile, onProfileChanged, onDataChanged) {
    const runtimeConfig = await loadRuntimeConfig();
    const root = el('div', 'screen settings-screen', [
        el('div', 'screen-heading', [el('div', '', [
                el('h1', '', ['Perfil e dados']),
                el('p', '', ['Seu nome, seus dados e as opções essenciais do Orion.'])
            ])])
    ]);
    const nameInput = textField('Nome', profile.displayName);
    const profileCard = el('section', 'settings-card', [
        el('div', 'settings-card-heading', [el('h2', '', ['Seu perfil'])]),
        labeledField('Como o Orion deve chamar você', nameInput),
        button('btn primary full', 'Salvar nome', () => {
            void updateProfileIdentity(repositories.profiles, profile, { displayName: nameInput.value, completeOnboarding: true })
                .then((updated) => { onProfileChanged(updated); showToast('Nome atualizado.', 'success'); })
                .catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível atualizar seu nome.', 'error'));
        })
    ]);
    const exportButton = button('btn secondary full', 'Criar backup', () => {
        void createProfileBackup(repositories, profile).then((backup) => {
            const day = new Date().toISOString().slice(0, 10);
            downloadTextFile(`orion-backup-${day}.json`, serializeBackup(backup));
            showToast('Backup criado.', 'success');
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível criar o backup.', 'error'));
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
            showConfirmation('Restaurar este backup?', 'Os dados atuais deste perfil serão substituídos pelos dados do arquivo selecionado.', 'Restaurar', () => {
                void replaceProfileDataAtomically(profile.id, rebound).then(() => {
                    const restoredProfile = rebound.profiles[0];
                    if (restoredProfile)
                        onProfileChanged(restoredProfile);
                    showToast('Backup restaurado.', 'success');
                    onDataChanged();
                }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível restaurar o backup.', 'error'));
            });
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Esse arquivo não é um backup válido.', 'error'));
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
            const summary = `${counts.accounts ?? 0} contas · ${counts.transactions ?? 0} movimentações · ${counts.debts ?? 0} dívidas.`;
            showConfirmation('Trazer dados do Orion anterior?', `Encontramos ${summary} Antes de importar, o Orion criará um backup da base atual.`, 'Importar dados', () => {
                void createProfileBackup(repositories, profile).then(async (currentBackup) => {
                    const stamp = new Date().toISOString().slice(0, 10);
                    downloadTextFile(`orion-antes-da-importacao-${stamp}.json`, serializeBackup(currentBackup));
                    await applyPreparedLegacyMigration(prepared, profile.id);
                    const migratedProfile = prepared.data.profiles[0];
                    if (migratedProfile)
                        onProfileChanged(migratedProfile);
                    onDataChanged();
                    showToast('Dados importados.', 'success');
                }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível importar os dados.', 'error'));
            });
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Esse arquivo não é compatível.', 'error'));
        legacyInput.value = '';
    });
    const resetButton = button('btn secondary full', 'Recomeçar com uma base nova', () => {
        showConfirmation('Recomeçar com uma base nova?', 'O Orion criará um backup antes de limpar os dados deste perfil. Depois, você fará o início novamente.', 'Criar backup e recomeçar', () => {
            resetButton.disabled = true;
            void createProfileBackup(repositories, profile).then(async (backup) => {
                const day = new Date().toISOString().slice(0, 10);
                downloadTextFile(`orion-antes-de-recomecar-${day}.json`, serializeBackup(backup));
                await replaceProfileDataAtomically(profile.id, createFreshProfileData(profile));
                window.location.reload();
            }).catch((error) => {
                resetButton.disabled = false;
                showToast(error instanceof Error ? error.message : 'Não foi possível preparar uma base nova.', 'error');
            });
        });
    });
    const dataCard = el('section', 'settings-card', [
        el('div', 'settings-card-heading', [el('h2', '', ['Backup'])]),
        el('p', 'settings-help settings-help-prominent', ['Seus dados ficam neste dispositivo. Crie um backup quando quiser guardar uma cópia de segurança.']),
        exportButton,
        button('btn secondary full', 'Restaurar backup', () => fileInput.click()),
        fileInput,
        legacyInput,
        disclosure('Outras opções', 'Importar uma base antiga ou começar do zero.', [
            button('btn secondary full', 'Trazer dados de outro Orion', () => legacyInput.click()),
            resetButton
        ])
    ]);
    const technicalReportButton = button('btn secondary full', 'Verificar funcionamento', () => {
        technicalReportButton.disabled = true;
        technicalReportButton.textContent = 'Verificando…';
        void createTechnicalReport(runtimeConfig).then((report) => {
            const healthy = report.database.status === 'healthy';
            showToast(healthy ? 'Tudo certo com os dados locais.' : 'O armazenamento local precisa de atenção.', healthy ? 'success' : 'error');
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível verificar o dispositivo.', 'error')).finally(() => {
            technicalReportButton.disabled = false;
            technicalReportButton.textContent = 'Verificar funcionamento';
        });
    });
    const exportTechnicalReportButton = button('btn secondary full', 'Exportar relatório para suporte', () => {
        exportTechnicalReportButton.disabled = true;
        void createTechnicalReport(runtimeConfig).then((report) => {
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            downloadTextFile(`orion-suporte-${stamp}.json`, serializeTechnicalReport(report));
            showToast('Relatório para suporte criado.', 'success');
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Não foi possível criar o relatório.', 'error')).finally(() => {
            exportTechnicalReportButton.disabled = false;
        });
    });
    const supportCard = el('section', 'settings-card settings-card-compact', [
        disclosure('Ajuda e informações', 'Versão, instalação e ferramentas de suporte.', [
            el('div', 'settings-simple-info', [
                el('div', '', [el('span', '', ['Versão']), el('strong', '', [APP_VERSION])]),
                el('div', '', [el('span', '', ['Conexão']), el('strong', '', [navigator.onLine ? 'Online' : 'Offline'])]),
                el('div', '', [el('span', '', ['Uso']), el('strong', '', [standaloneMode() ? 'App instalado' : 'Navegador'])])
            ]),
            el('p', 'settings-help', ['Seus dados financeiros ficam neste dispositivo e não são enviados automaticamente.']),
            standaloneMode()
                ? el('p', 'settings-help', ['O Orion está instalado neste dispositivo.'])
                : el('p', 'settings-help', ['No iPhone: Safari → Compartilhar → Adicionar à Tela de Início.']),
            technicalReportButton,
            exportTechnicalReportButton
        ])
    ]);
    root.append(profileCard, dataCard, supportCard);
    return root;
}
