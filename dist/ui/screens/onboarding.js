import { createAccount } from '../../application/accounts/create-account.js';
import { updateProfileIdentity } from '../../application/profile/update-profile.js';
import { listInstitutions, getInstitution } from '../../catalog/institutions.js';
import { ACCOUNT_TYPE_OPTIONS } from '../../catalog/account-types.js';
import { parseBackup } from '../../data/backup/validate.js';
import { rebindSingleProfileBackup } from '../../data/backup/rebind.js';
import { replaceProfileDataAtomically } from '../../data/backup/restore.js';
import { readJsonDocument } from '../../data/import/json-document.js';
import { applyPreparedLegacyMigration, prepareLegacyMigration } from '../../migration/legacy/apply.js';
import { el, button } from '../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../components/fields.js';
import { showSheet } from '../components/sheets.js';
import { showToast } from '../components/feedback.js';
function normalizedName(value) {
    const name = value.trim();
    if (name.length < 2 || name.length > 60)
        throw new RangeError('Informe um nome entre 2 e 60 caracteres.');
    return name;
}
function completedProfile(profile, displayName) {
    const now = new Date().toISOString();
    return {
        ...profile,
        displayName: normalizedName(displayName),
        onboardingCompletedAt: profile.onboardingCompletedAt ?? now,
        updatedAt: now
    };
}
export function showOnboarding(repositories, profile, callbacks) {
    const content = el('div', 'onboarding-content onboarding-flow');
    const actions = el('div', 'onboarding-actions');
    const name = textField('Nome', profile.displayName === 'Usuário' ? '' : profile.displayName);
    name.placeholder = 'Seu nome';
    let close = () => undefined;
    const renderWelcome = () => {
        content.replaceChildren(el('div', 'onboarding-symbol', ['✦']), el('div', 'onboarding-step', ['PASSO 1 DE 3']), el('h3', '', ['Bem-vindo ao Orion']), el('p', '', ['Organize sua vida financeira de forma simples, com seus dados no próprio dispositivo e uma base preparada para crescer com você.']), labeledField('Como devemos chamar você?', name));
        actions.replaceChildren(button('btn primary full', 'Continuar', () => {
            try {
                normalizedName(name.value);
                renderStartMode();
            }
            catch (error) {
                showToast(error instanceof Error ? error.message : 'Revise seu nome.', 'error');
            }
        }));
    };
    const fileInput = el('input', 'visually-hidden');
    fileInput.type = 'file';
    fileInput.accept = '.json,.zip,application/json,application/zip';
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (!file)
            return;
        const displayName = name.value;
        void importExistingData(file, displayName).finally(() => { fileInput.value = ''; });
    });
    const importExistingData = async (file, displayName) => {
        try {
            const raw = await readJsonDocument(file);
            const target = completedProfile(profile, displayName);
            try {
                const parsed = parseBackup(raw);
                const rebound = rebindSingleProfileBackup(parsed.data, target);
                await replaceProfileDataAtomically(profile.id, rebound);
                close();
                callbacks.onComplete(target);
                callbacks.onDataChanged();
                showToast('Backup restaurado. Seu Orion está pronto.', 'success');
                return;
            }
            catch (newBackupError) {
                try {
                    const prepared = await prepareLegacyMigration(raw, profile.id);
                    await applyPreparedLegacyMigration(prepared, profile.id);
                    const migrated = prepared.data.profiles[0] ?? profile;
                    const updated = await updateProfileIdentity(repositories.profiles, migrated, { displayName, completeOnboarding: true });
                    close();
                    callbacks.onComplete(updated);
                    callbacks.onDataChanged();
                    showToast('Dados do Orion anterior migrados com segurança.', 'success');
                    return;
                }
                catch {
                    throw newBackupError;
                }
            }
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : 'Não foi possível importar este arquivo.', 'error');
        }
    };
    const renderStartMode = () => {
        const clean = button('onboarding-choice', 'Começar com uma base nova', renderFirstAccount);
        clean.prepend(el('span', 'onboarding-choice-icon', ['＋']));
        clean.append(el('small', '', ['Cadastre sua primeira conta e comece a registrar a partir de agora.']));
        const importButton = button('onboarding-choice', 'Trazer meus dados', () => fileInput.click());
        importButton.prepend(el('span', 'onboarding-choice-icon', ['⇩']));
        importButton.append(el('small', '', ['Aceita backup Orion em JSON ou ZIP e reconhece a geração anterior.']));
        content.replaceChildren(el('div', 'onboarding-step', ['PASSO 2 DE 3']), el('h3', '', ['Como você quer começar?']), el('p', '', ['O controle manual continua sendo a base. Você pode importar agora ou começar limpo.']), el('div', 'onboarding-choice-list', [clean, importButton]), fileInput);
        actions.replaceChildren(button('btn secondary full', 'Voltar', renderWelcome));
    };
    const renderFirstAccount = () => {
        const institutions = listInstitutions();
        const institution = selectorField('Instituição', institutions.map((item) => ({ value: item.id, label: item.name })), 'inter');
        const type = selectorField('Tipo de conta', ACCOUNT_TYPE_OPTIONS, 'checking');
        const customInstitutionName = textField('Nome da instituição');
        const customInstitutionNameField = labeledField('Nome da instituição', customInstitutionName);
        const openingBalance = moneyField('Saldo inicial');
        customInstitutionName.placeholder = 'Ex.: Cooperativa local';
        const syncCustomInstitutionName = () => {
            const isCustom = institution.getValue() === 'custom';
            customInstitutionNameField.hidden = !isCustom;
            if (!isCustom)
                customInstitutionName.value = '';
        };
        institution.element.addEventListener('selectorchange', syncCustomInstitutionName);
        syncCustomInstitutionName();
        const finishWithoutAccount = async () => {
            try {
                const updated = await updateProfileIdentity(repositories.profiles, profile, { displayName: name.value, completeOnboarding: true });
                close();
                callbacks.onComplete(updated);
                callbacks.onDataChanged();
            }
            catch (error) {
                showToast(error instanceof Error ? error.message : 'Não foi possível concluir.', 'error');
            }
        };
        const save = button('btn primary full', 'Criar conta e entrar', () => {
            const institutionId = institution.getValue();
            const accountType = type.getValue();
            if (!institutionId || !accountType) {
                showToast('Selecione instituição e tipo de conta.', 'error');
                return;
            }
            save.disabled = true;
            const institutionData = getInstitution(institutionId);
            const accountName = institutionId === 'custom'
                ? customInstitutionName.value.trim()
                : institutionData?.name ?? 'Conta principal';
            if (!accountName) {
                save.disabled = false;
                showToast('Informe o nome da instituição.', 'error');
                return;
            }
            void createAccount(repositories.accounts, {
                profileId: profile.id,
                institutionId,
                type: accountType,
                name: accountName,
                openingBalance: openingBalance.value || '0',
                color: institutionData?.color ?? '#58708f'
            }).then(async () => {
                const updated = await updateProfileIdentity(repositories.profiles, profile, { displayName: name.value, completeOnboarding: true });
                close();
                callbacks.onComplete(updated);
                callbacks.onDataChanged();
                showToast('Sua primeira conta foi criada.', 'success');
            }).catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Não foi possível criar a conta.', 'error'); });
        });
        content.replaceChildren(el('div', 'onboarding-step', ['PASSO 3 DE 3']), el('h3', '', ['Cadastre sua primeira conta']), el('p', '', ['O saldo inicial é o ponto de partida. Depois, suas receitas, despesas e transferências ficam registradas no histórico.']), institution.element, type.element, customInstitutionNameField, labeledField('Saldo inicial', openingBalance));
        actions.replaceChildren(button('btn secondary full', 'Agora não', () => void finishWithoutAccount()), save);
    };
    renderWelcome();
    close = showSheet('Configuração inicial', content, actions);
}
