import { createDebt } from '../../../application/debts/create-debt.js';
import { payDebt } from '../../../application/debts/pay-debt.js';
import { el } from '../../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions, institutionOptions, todayISO } from './shared.js';
export function openCreateDebtSheet(context) {
    const institution = selectorField('Instituição', institutionOptions(), 'custom');
    const kind = selectorField('Tipo', [{ value: 'formal', label: 'Formal' }, { value: 'informal', label: 'Informal' }, { value: 'tax', label: 'Tributária' }, { value: 'other', label: 'Outra' }], 'formal');
    const priority = selectorField('Prioridade', [{ value: 'high', label: 'Alta' }, { value: 'medium', label: 'Média' }, { value: 'low', label: 'Baixa' }], 'medium');
    const name = textField('Nome');
    name.placeholder = 'Ex.: Empréstimo';
    const creditor = textField('Credor');
    const baseDate = textField('Data-base', todayISO(), 'date');
    const balance = moneyField('Saldo atual');
    const settlement = moneyField('Oferta de quitação');
    settlement.placeholder = 'Opcional';
    const monthlyRate = textField('Juros mensais');
    monthlyRate.inputMode = 'decimal';
    monthlyRate.placeholder = 'Ex.: 4,99';
    const annualRate = textField('Juros anuais');
    annualRate.inputMode = 'decimal';
    annualRate.placeholder = 'Opcional';
    const offerExpiry = textField('Validade da oferta', '', 'date');
    const note = textField('Observação');
    const form = el('form', 'form-stack', [institution.element, kind.element, priority.element, labeledField('Nome', name), labeledField('Credor', creditor),
        labeledField('Data-base', baseDate), labeledField('Saldo da dívida', balance), labeledField('Oferta de quitação', settlement),
        labeledField('Validade da oferta', offerExpiry), labeledField('Taxa mensal (%)', monthlyRate), labeledField('Taxa anual (%)', annualRate), labeledField('Observação', note)]);
    const save = el('button', 'btn primary full-width', ['Salvar dívida']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Nova dívida', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const institutionId = institution.getValue();
        if (!institutionId)
            return;
        save.disabled = true;
        void createDebt(context.repositories.debts, {
            profileId: context.profile.id, institutionId, name: name.value, openingBalance: balance.value,
            ...(creditor.value.trim() ? { creditor: creditor.value.trim() } : {}),
            ...(kind.getValue() ? { kind: kind.getValue() } : {}),
            baseDate: baseDate.value,
            ...(settlement.value ? { settlementOffer: settlement.value } : {}),
            ...(offerExpiry.value ? { offerExpiry: offerExpiry.value } : {}),
            ...(priority.getValue() ? { priority: priority.getValue() } : {}),
            ...(note.value.trim() ? { note: note.value.trim() } : {}),
            ...(monthlyRate.value ? { monthlyRate: monthlyRate.value } : {}), ...(annualRate.value ? { annualRate: annualRate.value } : {})
        }).then(() => { close(); showToast('Dívida registrada.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao criar dívida.', 'error'); });
    });
}
export async function openPayDebtSheet(context, debtId, outstandingLabel) {
    const accounts = await accountOptions(context);
    if (accounts.length === 0) {
        showToast('Cadastre uma conta antes de pagar dívida.', 'error');
        return;
    }
    const account = selectorField('Conta', accounts, accounts[0]?.value ?? null);
    const amount = moneyField('Valor');
    amount.placeholder = outstandingLabel;
    const date = textField('Data', todayISO(), 'date');
    const form = el('form', 'form-stack', [labeledField('Valor', amount), labeledField('Data', date), account.element]);
    const save = el('button', 'btn primary full-width', ['Registrar pagamento']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Pagar dívida', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const accountId = account.getValue();
        if (!accountId)
            return;
        save.disabled = true;
        void payDebt(context.repositories.transactions, context.repositories.debts, context.repositories.accounts, {
            profileId: context.profile.id, debtId, accountId, amount: amount.value, date: date.value
        }).then(() => { close(); showToast('Pagamento registrado.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha no pagamento.', 'error'); });
    });
}
