import { createAsset } from '../../../application/assets/create-asset.js';
import { recordAssetOperation } from '../../../application/assets/record-asset-operation.js';
import { el } from '../../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions, institutionOptions, todayISO } from './shared.js';
const ASSET_KINDS = [
    { value: 'investment', label: 'Investimento' },
    { value: 'guarantee', label: 'Garantia / CDB com limite' },
    { value: 'cash-equivalent', label: 'Reserva de alta liquidez' },
    { value: 'other', label: 'Outro ativo financeiro' }
];
const LIQUIDITY = [
    { value: 'immediate', label: 'Imediata' }, { value: 'd1', label: 'D+1' },
    { value: 'restricted', label: 'Restrita / bloqueável' }, { value: 'other', label: 'Outra' }
];
export function openCreateAssetSheet(context) {
    const institution = selectorField('Instituição', institutionOptions(), 'inter');
    const kind = selectorField('Tipo', ASSET_KINDS, 'investment');
    const liquidity = selectorField('Liquidez', LIQUIDITY, 'immediate');
    const name = textField('Nome');
    name.placeholder = 'Ex.: CDB Mais Limite';
    const opening = moneyField('Valor inicial');
    const policy = textField('Política');
    policy.placeholder = 'Opcional · ex.: inter-cdb-mais-limite';
    const form = el('form', 'form-stack', [institution.element, kind.element, liquidity.element,
        labeledField('Nome', name), labeledField('Valor inicial', opening), labeledField('Política do produto', policy)]);
    const save = el('button', 'btn primary full-width', ['Salvar ativo']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Novo ativo', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const institutionId = institution.getValue();
        const assetKind = kind.getValue();
        const assetLiquidity = liquidity.getValue();
        if (!institutionId || !assetKind || !assetLiquidity)
            return;
        save.disabled = true;
        void createAsset(context.repositories.assets, {
            profileId: context.profile.id, institutionId, name: name.value, kind: assetKind,
            openingValue: opening.value || '0', liquidity: assetLiquidity, ...(policy.value.trim() ? { policyId: policy.value.trim() } : {})
        }).then(() => { close(); showToast('Ativo criado.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao criar ativo.', 'error'); });
    });
}
export async function openAssetOperationSheet(context, assetId) {
    const accounts = await accountOptions(context);
    const operation = selectorField('Operação', [
        { value: 'contribution', label: 'Aporte', description: 'Conta → ativo; não é despesa' },
        { value: 'withdrawal', label: 'Resgate', description: 'Ativo → conta; não é receita' },
        { value: 'yield', label: 'Rendimento creditado', description: 'Fato financeiro confirmado' },
        { value: 'valuation', label: 'Valorização / desvalorização', description: 'Ajuste patrimonial não realizado' }
    ], 'contribution');
    const amount = moneyField('Valor');
    const date = textField('Data', todayISO(), 'date');
    const description = textField('Descrição');
    const accountHost = el('div', 'dynamic-field-host');
    let accountId = accounts[0]?.value ?? null;
    const syncAccount = () => {
        accountHost.replaceChildren();
        if (operation.getValue() !== 'contribution' && operation.getValue() !== 'withdrawal')
            return;
        if (accounts.length === 0) {
            accountHost.append(el('div', 'inline-warning', ['Cadastre uma conta para aporte ou resgate.']));
            accountId = null;
            return;
        }
        const selector = selectorField(operation.getValue() === 'contribution' ? 'Conta de origem' : 'Conta de destino', accounts, accountId);
        selector.element.addEventListener('selectorchange', () => { accountId = selector.getValue(); });
        accountHost.append(selector.element);
    };
    operation.element.addEventListener('selectorchange', syncAccount);
    syncAccount();
    const form = el('form', 'form-stack', [operation.element, accountHost, labeledField('Valor', amount), labeledField('Data', date), labeledField('Descrição', description)]);
    const save = el('button', 'btn primary full-width', ['Salvar operação']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Movimentar ativo', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = operation.getValue();
        if (!selected)
            return;
        save.disabled = true;
        const common = { profileId: context.profile.id, assetId, amount: amount.value, date: date.value, ...(description.value ? { description: description.value } : {}) };
        const input = selected === 'contribution' || selected === 'withdrawal'
            ? { ...common, kind: selected, accountId: accountId }
            : { ...common, kind: selected };
        void recordAssetOperation(context.repositories.transactions, context.repositories.assets, context.repositories.accounts, input)
            .then(() => { close(); showToast('Ativo atualizado.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao atualizar ativo.', 'error'); });
    });
}
