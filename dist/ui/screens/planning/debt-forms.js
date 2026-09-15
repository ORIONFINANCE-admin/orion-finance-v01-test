import { createDebt } from '../../../application/debts/create-debt.js';
import { payDebt } from '../../../application/debts/pay-debt.js';
import { el } from '../../dom.js';
import { icon } from '../../icons.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions, institutionOptions, todayISO } from './shared.js';
export function openCreateDebtSheet(context) {
    const name = textField('Qual é a dívida?');
    name.placeholder = 'Ex.: Empréstimo pessoal';
    const creditor = textField('Para quem você deve?');
    creditor.placeholder = 'Ex.: Banco, loja ou pessoa';
    const balance = moneyField('Quanto falta pagar?');
    const hasOffer = selectorField('Recebeu uma oferta para quitar esta dívida?', [
        { value: 'no', label: 'Não' },
        { value: 'yes', label: 'Sim' }
    ], 'no');
    const settlement = moneyField('Valor da oferta');
    const offerExpiry = textField('Até quando vale a oferta?', '', 'date');
    const offerFields = el('div', 'form-stack debt-offer-fields', [
        labeledField('Valor para quitar', settlement),
        labeledField('Validade da oferta (opcional)', offerExpiry)
    ]);
    offerFields.hidden = true;
    hasOffer.element.addEventListener('selectorchange', () => {
        offerFields.hidden = hasOffer.getValue() !== 'yes';
    });
    const institution = selectorField('Instituição (opcional)', institutionOptions(), null);
    const kind = selectorField('Tipo de dívida (opcional)', [
        { value: 'formal', label: 'Banco, financeira ou empresa' },
        { value: 'informal', label: 'Pessoa conhecida ou dívida pessoal' },
        { value: 'tax', label: 'Imposto ou tributo' },
        { value: 'other', label: 'Outro tipo' }
    ], null);
    const priority = selectorField('Qual a urgência desta dívida?', [
        { value: 'high', label: 'Quero pagar primeiro' },
        { value: 'medium', label: 'Normal' },
        { value: 'low', label: 'Pode esperar' }
    ], null);
    const baseDate = textField('Saldo atualizado em', todayISO(), 'date');
    const monthlyRate = textField('Juros ao mês');
    monthlyRate.inputMode = 'decimal';
    monthlyRate.placeholder = 'Ex.: 4,99';
    const annualRate = textField('Juros ao ano');
    annualRate.inputMode = 'decimal';
    annualRate.placeholder = 'Opcional';
    const note = textField('Observação');
    const advanced = el('details', 'form-disclosure', [
        el('summary', 'form-disclosure-summary', [
            el('span', '', [el('strong', '', ['Mais detalhes']), el('small', '', ['Juros, classificação e outras informações opcionais.'])]),
            el('span', 'form-disclosure-chevron', [icon('chevron', 'form-disclosure-chevron-icon')])
        ]),
        el('div', 'form-disclosure-content form-stack', [
            institution.element,
            kind.element,
            priority.element,
            labeledField('Saldo atualizado em', baseDate),
            labeledField('Juros ao mês (%)', monthlyRate),
            labeledField('Juros ao ano (%)', annualRate),
            labeledField('Observação', note)
        ])
    ]);
    const form = el('form', 'form-stack', [
        el('p', 'form-support', ['Para começar, basta informar qual é a dívida e quanto ainda falta pagar.']),
        labeledField('Qual é a dívida?', name),
        labeledField('Para quem você deve? (opcional)', creditor),
        labeledField('Quanto falta pagar?', balance),
        hasOffer.element,
        offerFields,
        advanced
    ]);
    const save = el('button', 'btn primary full-width', ['Salvar dívida']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Nova dívida', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (hasOffer.getValue() === 'yes' && !settlement.value) {
            showToast('Informe o valor da oferta para quitar.', 'error');
            return;
        }
        save.disabled = true;
        const institutionId = institution.getValue();
        const selectedKind = kind.getValue();
        const selectedPriority = priority.getValue();
        void createDebt(context.repositories.debts, {
            profileId: context.profile.id,
            name: name.value,
            openingBalance: balance.value,
            ...(creditor.value.trim() ? { creditor: creditor.value.trim() } : {}),
            ...(institutionId ? { institutionId } : {}),
            ...(selectedKind ? { kind: selectedKind } : {}),
            baseDate: baseDate.value,
            ...(hasOffer.getValue() === 'yes' && settlement.value ? { settlementOffer: settlement.value } : {}),
            ...(hasOffer.getValue() === 'yes' && offerExpiry.value ? { offerExpiry: offerExpiry.value } : {}),
            ...(selectedPriority ? { priority: selectedPriority } : {}),
            ...(note.value.trim() ? { note: note.value.trim() } : {}),
            ...(monthlyRate.value ? { monthlyRate: monthlyRate.value } : {}),
            ...(annualRate.value ? { annualRate: annualRate.value } : {})
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
    const defaultAccount = accounts.length === 1 ? accounts[0]?.value ?? null : null;
    const account = selectorField('Conta usada no pagamento', accounts, defaultAccount);
    const amount = moneyField('Quanto você pagou?');
    amount.placeholder = outstandingLabel;
    const date = textField('Quando pagou?', todayISO(), 'date');
    const form = el('form', 'form-stack', [
        labeledField('Quanto você pagou?', amount),
        labeledField('Quando pagou?', date),
        account.element
    ]);
    const save = el('button', 'btn primary full-width', ['Registrar pagamento']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Registrar pagamento da dívida', form);
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
