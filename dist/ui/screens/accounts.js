import { createAccount } from '../../application/accounts/create-account.js';
import { updateAccountDetails } from '../../application/accounts/update-account.js';
import { getDashboardSnapshot } from '../../application/dashboard/get-dashboard.js';
import { listInstitutions, getInstitution } from '../../catalog/institutions.js';
import { ACCOUNT_TYPE_OPTIONS } from '../../catalog/account-types.js';
import { formatBRL } from '../../domain/money/money.js';
import { el } from '../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../components/fields.js';
import { showSheet } from '../components/sheets.js';
import { showToast } from '../components/feedback.js';
import { confirmEntityDeactivation, showEntityActions } from '../components/entity-actions.js';
export async function renderAccounts(repositories, profile, lifecycle, onChanged) {
    const snapshot = await getDashboardSnapshot(repositories, profile.id);
    const root = el('div', 'screen accounts-screen', [
        el('div', 'screen-heading', [
            el('div', '', [el('h1', '', ['Contas']), el('p', '', ['Única área proprietária da gestão de contas.'])]),
            el('button', 'btn compact primary', ['+ Adicionar'])
        ])
    ]);
    const addButton = root.querySelector('button');
    addButton?.addEventListener('click', () => openCreateAccountSheet(repositories, profile, onChanged));
    root.append(el('section', 'accounts-summary', [
        el('div', '', [el('small', '', ['DISPONÍVEL']), el('strong', '', [formatBRL(snapshot.availableNow)])]),
        el('div', '', [el('small', '', ['CONTAS ATIVAS']), el('strong', '', [String(snapshot.accounts.length)])])
    ]));
    if (snapshot.accounts.length === 0) {
        root.append(el('div', 'empty-card large', [
            el('strong', '', ['Adicione sua primeira conta']),
            el('span', '', ['O Orion é manual-first: você controla o que entra, sai e como deseja organizar.'])
        ]));
        return root;
    }
    const list = el('section', 'accounts-detail-list');
    for (const account of snapshot.accounts)
        list.append(accountCard(account, snapshot.balances.get(account.id) ?? account.openingBalance, repositories, profile, lifecycle, onChanged));
    root.append(list);
    return root;
}
function accountCard(account, balance, repositories, profile, lifecycle, onChanged) {
    const institution = getInstitution(account.institutionId);
    const mark = el('span', 'institution-mark large', [institution?.shortName ?? account.name.slice(0, 2).toUpperCase()]);
    mark.style.setProperty('--institution-color', account.color ?? institution?.color ?? '#58708f');
    const row = el('button', 'account-detail-card account-card-button', [
        mark,
        el('div', 'account-copy', [
            el('strong', '', [account.name]),
            el('small', '', [institution?.name ?? 'Outra instituição'])
        ]),
        el('div', 'account-detail-value', [
            el('small', '', ['SALDO']),
            el('strong', '', [formatBRL(balance)])
        ])
    ]);
    row.type = 'button';
    row.setAttribute('aria-label', `${account.name}. Saldo ${formatBRL(balance)}. Abrir ações.`);
    row.addEventListener('click', () => showEntityActions(account.name, () => openEditAccountSheet(repositories, profile, lifecycle, account, onChanged), () => confirmEntityDeactivation(lifecycle, profile.id, 'account', account.id, 'Conta', onChanged)));
    return row;
}
function openCreateAccountSheet(repositories, profile, onChanged) {
    const institutions = listInstitutions();
    const institution = selectorField('Instituição', institutions.map((item) => ({ value: item.id, label: item.name })), 'inter');
    const type = selectorField('Tipo de conta', ACCOUNT_TYPE_OPTIONS, 'checking');
    const nameInput = textField('Nome da conta');
    const balanceInput = moneyField('Saldo inicial');
    nameInput.placeholder = 'Ex.: Conta principal';
    let lastAutoName = '';
    institution.element.addEventListener('selectorchange', () => {
        const selected = getInstitution(institution.getValue() ?? undefined);
        const currentName = nameInput.value.trim();
        if (selected && (!currentName || currentName === lastAutoName)) {
            nameInput.value = selected.name;
            lastAutoName = selected.name;
        }
    });
    const form = el('form', 'form-stack', [institution.element, type.element, labeledField('Nome', nameInput), labeledField('Saldo inicial', balanceInput)]);
    const save = el('button', 'btn primary full-width', ['Salvar conta']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Nova conta', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const institutionId = institution.getValue();
        const accountType = type.getValue();
        if (!institutionId || !accountType) {
            showToast('Selecione instituição e tipo de conta.', 'error');
            return;
        }
        save.disabled = true;
        const institutionData = getInstitution(institutionId);
        void createAccount(repositories.accounts, {
            profileId: profile.id, institutionId, type: accountType, name: nameInput.value,
            openingBalance: balanceInput.value || '0', color: institutionData?.color ?? '#58708f'
        }).then(() => { close(); showToast('Conta criada com segurança.', 'success'); onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Não foi possível criar a conta.', 'error'); });
    });
}
function openEditAccountSheet(repositories, profile, lifecycle, account, onChanged) {
    const institutions = listInstitutions();
    const institution = selectorField('Instituição', institutions.map((item) => ({ value: item.id, label: item.name })), account.institutionId ?? 'custom');
    const type = selectorField('Tipo de conta', ACCOUNT_TYPE_OPTIONS, account.type ?? 'other');
    const availability = selectorField('Disponibilidade', [
        { value: 'yes', label: 'Disponível para uso', description: 'Entra em Disponível agora e Livre para decidir.' },
        { value: 'no', label: 'Não disponível', description: 'Permanece patrimonial, mas não entra no caixa disponível.' }
    ], account.includeInAvailable === false ? 'no' : 'yes');
    const name = textField('Nome da conta', account.name);
    const note = el('div', 'inline-warning', ['O saldo inicial não é editado aqui para preservar o histórico. Ajustes financeiros devem ser registrados como fatos.']);
    const form = el('form', 'form-stack', [institution.element, type.element, availability.element, labeledField('Nome', name), note]);
    const save = el('button', 'btn primary full-width', ['Salvar alterações']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Editar conta', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const institutionId = institution.getValue();
        const accountType = type.getValue();
        const available = availability.getValue();
        if (!institutionId || !accountType || !available) {
            showToast('Revise os campos da conta.', 'error');
            return;
        }
        save.disabled = true;
        void updateAccountDetails(repositories.accounts, lifecycle, {
            profileId: profile.id, accountId: account.id, name: name.value, institutionId, type: accountType,
            ...(getInstitution(institutionId)?.color ?? account.color ? { color: getInstitution(institutionId)?.color ?? account.color } : {}), includeInAvailable: available === 'yes'
        }).then(() => { close(); showToast('Conta atualizada.', 'success'); onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Não foi possível atualizar a conta.', 'error'); });
    });
}
