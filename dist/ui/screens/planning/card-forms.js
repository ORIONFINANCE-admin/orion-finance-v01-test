import { createCreditCard } from '../../../application/credit-cards/create-credit-card.js';
import { payCreditCard } from '../../../application/credit-cards/pay-credit-card.js';
import { el } from '../../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions, assetOptions, institutionOptions, todayISO } from './shared.js';
export async function openCreateCardSheet(context) {
    const accounts = await accountOptions(context);
    const guarantees = await assetOptions(context, 'guarantee');
    const institution = selectorField('Instituição', institutionOptions(), 'inter');
    const paymentAccount = selectorField('Conta para pagamento', [{ value: '', label: 'Nenhuma por enquanto' }, ...accounts], '');
    const guarantee = selectorField('Garantia vinculada', [{ value: '', label: 'Sem garantia' }, ...guarantees], '');
    const name = textField('Nome');
    name.placeholder = 'Ex.: Inter Mastercard';
    const opening = moneyField('Fatura inicial');
    opening.placeholder = '0,00';
    const limit = moneyField('Limite');
    limit.placeholder = 'Opcional';
    const closing = textField('Fechamento');
    closing.inputMode = 'numeric';
    closing.placeholder = 'Opcional';
    const due = textField('Vencimento');
    due.inputMode = 'numeric';
    due.placeholder = 'Opcional';
    const form = el('form', 'form-stack', [institution.element, labeledField('Nome', name), paymentAccount.element, guarantee.element,
        labeledField('Fatura inicial', opening), labeledField('Limite de crédito', limit), labeledField('Dia de fechamento', closing), labeledField('Dia de vencimento', due)]);
    const save = el('button', 'btn primary full-width', ['Salvar cartão']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Novo cartão', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const institutionId = institution.getValue();
        if (!institutionId)
            return;
        save.disabled = true;
        void createCreditCard(context.repositories.creditCards, context.repositories.accounts, context.repositories.assets, {
            profileId: context.profile.id, institutionId, name: name.value,
            ...(paymentAccount.getValue() ? { paymentAccountId: paymentAccount.getValue() } : {}),
            ...(guarantee.getValue() ? { guaranteeAssetId: guarantee.getValue() } : {}),
            openingLiability: opening.value || '0', ...(limit.value ? { creditLimit: limit.value } : {}),
            ...(closing.value ? { closingDay: Number(closing.value) } : {}), ...(due.value ? { dueDay: Number(due.value) } : {})
        }).then(() => { close(); showToast('Cartão criado.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao criar cartão.', 'error'); });
    });
}
export async function openPayCardSheet(context, cardId, liabilityLabel) {
    const [accounts, guarantees] = await Promise.all([accountOptions(context), assetOptions(context, 'guarantee')]);
    const sources = [
        ...accounts.map((item) => ({ value: `account:${item.value}`, label: item.label, description: 'Saldo disponível' })),
        ...guarantees.map((item) => ({ value: `asset:${item.value}`, label: item.label, description: 'Usar garantia' }))
    ];
    if (sources.length === 0) {
        showToast('Cadastre uma conta ou garantia antes de pagar.', 'error');
        return;
    }
    const amount = moneyField('Valor');
    amount.placeholder = liabilityLabel;
    const date = textField('Data', todayISO(), 'date');
    const source = selectorField('Origem do pagamento', sources, sources[0]?.value ?? null);
    const form = el('form', 'form-stack', [labeledField('Valor', amount), labeledField('Data', date), source.element]);
    const save = el('button', 'btn primary full-width', ['Registrar pagamento']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Pagar fatura', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const chosen = source.getValue();
        if (!chosen)
            return;
        save.disabled = true;
        const paymentSource = chosen.startsWith('account:')
            ? { kind: 'account', accountId: chosen.slice(8) }
            : { kind: 'guarantee-asset', assetId: chosen.slice(6) };
        void payCreditCard(context.repositories.transactions, context.repositories.creditCards, context.repositories.accounts, context.repositories.assets, {
            profileId: context.profile.id, creditCardId: cardId, amount: amount.value, date: date.value, source: paymentSource
        }).then(() => { close(); showToast('Fatura atualizada.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha no pagamento.', 'error'); });
    });
}
