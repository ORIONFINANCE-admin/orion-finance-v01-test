import { updateCreditCardDetails } from '../../../application/credit-cards/update-credit-card.js';
import { updateDebtDetails } from '../../../application/debts/update-debt.js';
import { updateAssetDetails } from '../../../application/assets/update-asset.js';
import { updateAllocationDetails } from '../../../application/allocations/update-allocation.js';
import { updateRecurrenceDetails } from '../../../application/recurrences/update-recurrence.js';
import { el } from '../../dom.js';
import { icon } from '../../icons.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions, assetOptions, centsToInput, institutionOptions } from './shared.js';
export async function openEditCardSheet(context, card) {
    const [accounts, guarantees] = await Promise.all([accountOptions(context), assetOptions(context, 'guarantee')]);
    const institution = selectorField('Instituição', institutionOptions(), card.institutionId ?? 'custom');
    const paymentAccount = selectorField('Conta para pagamento', [{ value: '', label: 'Nenhuma por enquanto' }, ...accounts], card.paymentAccountId ?? '');
    const guarantee = selectorField('Garantia vinculada', [{ value: '', label: 'Sem garantia' }, ...guarantees], card.guaranteeAssetId ?? '');
    const name = textField('Nome', card.name);
    const limit = moneyField('Limite');
    if (card.creditLimit !== undefined)
        limit.value = centsToInput(card.creditLimit);
    const closing = textField('Fechamento', card.closingDay ? String(card.closingDay) : '');
    closing.inputMode = 'numeric';
    const due = textField('Vencimento', card.dueDay ? String(card.dueDay) : '');
    due.inputMode = 'numeric';
    const note = el('div', 'inline-warning', ['A fatura inicial não é alterada aqui. Ajustes de obrigação devem ocorrer por compras e pagamentos.']);
    const form = el('form', 'form-stack', [institution.element, labeledField('Nome', name), paymentAccount.element, guarantee.element,
        labeledField('Limite de crédito', limit), labeledField('Dia de fechamento', closing), labeledField('Dia de vencimento', due), note]);
    const save = submitButton('Salvar alterações');
    form.append(save);
    const close = showSheet('Editar cartão', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const institutionId = institution.getValue();
        if (!institutionId)
            return;
        save.disabled = true;
        void updateCreditCardDetails(context.repositories.creditCards, context.repositories.accounts, context.repositories.assets, context.lifecycle, {
            profileId: context.profile.id, cardId: card.id, name: name.value, institutionId,
            ...(paymentAccount.getValue() ? { paymentAccountId: paymentAccount.getValue() } : {}),
            ...(guarantee.getValue() ? { guaranteeAssetId: guarantee.getValue() } : {}),
            ...(limit.value ? { creditLimit: limit.value } : {}),
            ...(closing.value ? { closingDay: Number(closing.value) } : {}),
            ...(due.value ? { dueDay: Number(due.value) } : {})
        }).then(() => done(close, 'Cartão atualizado.', context)).catch((error) => fail(save, error, 'Falha ao atualizar cartão.'));
    });
}
export function openEditDebtSheet(context, debt) {
    const name = textField('Qual é a dívida?', debt.name);
    const creditor = textField('Para quem você deve?', debt.creditor ?? '');
    const hasOffer = selectorField('Existe uma oferta para quitar esta dívida?', [
        { value: 'no', label: 'Não' }, { value: 'yes', label: 'Sim' }
    ], debt.settlementOffer !== undefined ? 'yes' : 'no');
    const settlement = moneyField('Valor da oferta');
    if (debt.settlementOffer !== undefined)
        settlement.value = centsToInput(debt.settlementOffer);
    const expiry = textField('Até quando vale a oferta?', debt.offerExpiry ?? '', 'date');
    const offerFields = el('div', 'form-stack debt-offer-fields', [
        labeledField('Valor para quitar', settlement),
        labeledField('Validade da oferta (opcional)', expiry)
    ]);
    offerFields.hidden = hasOffer.getValue() !== 'yes';
    hasOffer.element.addEventListener('selectorchange', () => {
        offerFields.hidden = hasOffer.getValue() !== 'yes';
    });
    const priority = selectorField('Qual a urgência desta dívida?', [
        { value: 'high', label: 'Quero pagar primeiro' },
        { value: 'medium', label: 'Normal' },
        { value: 'low', label: 'Pode esperar' }
    ], debt.priority ?? null);
    const note = textField('Observação', debt.note ?? '');
    const warning = el('div', 'inline-warning', ['O valor inicial e os pagamentos já registrados ficam preservados. O Orion continua calculando quanto falta pagar.']);
    const advanced = el('details', 'form-disclosure', [
        el('summary', 'form-disclosure-summary', [
            el('span', '', [el('strong', '', ['Mais detalhes']), el('small', '', ['Prioridade e observações opcionais.'])]),
            el('span', 'form-disclosure-chevron', [icon('chevron', 'form-disclosure-chevron-icon')])
        ]),
        el('div', 'form-disclosure-content form-stack', [priority.element, labeledField('Observação', note), warning])
    ]);
    const form = el('form', 'form-stack', [
        labeledField('Qual é a dívida?', name),
        labeledField('Para quem você deve? (opcional)', creditor),
        hasOffer.element,
        offerFields,
        advanced
    ]);
    const save = submitButton('Salvar alterações');
    form.append(save);
    const close = showSheet('Editar dívida', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (hasOffer.getValue() === 'yes' && !settlement.value) {
            showToast('Informe o valor da oferta para quitar.', 'error');
            return;
        }
        save.disabled = true;
        void updateDebtDetails(context.repositories.debts, context.lifecycle, {
            profileId: context.profile.id,
            debtId: debt.id,
            name: name.value,
            ...(creditor.value.trim() ? { creditor: creditor.value.trim() } : {}),
            ...(hasOffer.getValue() === 'yes' && settlement.value ? { settlementOffer: settlement.value } : {}),
            ...(hasOffer.getValue() === 'yes' && expiry.value ? { offerExpiry: expiry.value } : {}),
            ...(priority.getValue() ? { priority: priority.getValue() } : {}),
            ...(note.value.trim() ? { note: note.value.trim() } : {})
        }).then(() => done(close, 'Dívida atualizada.', context)).catch((error) => fail(save, error, 'Falha ao atualizar dívida.'));
    });
}
export function openEditAssetSheet(context, asset) {
    const liquidity = selectorField('Liquidez', [
        { value: 'immediate', label: 'Imediata' }, { value: 'd1', label: 'D+1' },
        { value: 'restricted', label: 'Restrita' }, { value: 'other', label: 'Outra' }
    ], asset.liquidity);
    const netWorth = selectorField('Patrimônio líquido', [
        { value: 'yes', label: 'Incluir no patrimônio' }, { value: 'no', label: 'Não incluir' }
    ], asset.includeInNetWorth ? 'yes' : 'no');
    const name = textField('Nome', asset.name);
    const policy = textField('Política do produto', asset.policyId ?? '');
    const warning = el('div', 'inline-warning', ['O valor inicial não é editado aqui. Aportes, resgates, rendimentos e valorizações permanecem fatos separados.']);
    const form = el('form', 'form-stack', [labeledField('Nome', name), liquidity.element, netWorth.element, labeledField('Política (opcional)', policy), warning]);
    const save = submitButton('Salvar alterações');
    form.append(save);
    const close = showSheet('Editar ativo', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const selectedLiquidity = liquidity.getValue();
        const include = netWorth.getValue();
        if (!selectedLiquidity || !include)
            return;
        save.disabled = true;
        void updateAssetDetails(context.repositories.assets, context.lifecycle, {
            profileId: context.profile.id, assetId: asset.id, name: name.value,
            liquidity: selectedLiquidity, includeInNetWorth: include === 'yes', ...(policy.value.trim() ? { policyId: policy.value.trim() } : {})
        }).then(() => done(close, 'Ativo atualizado.', context)).catch((error) => fail(save, error, 'Falha ao atualizar ativo.'));
    });
}
export function openEditAllocationSheet(context, allocation) {
    const protection = selectorField('Quer reservar esse valor para não usar em outras coisas?', [
        { value: 'yes', label: 'Sim, deixar separado', description: 'Esse valor deixa de aparecer como dinheiro livre para usar.' },
        { value: 'no', label: 'Não, só acompanhar', description: 'A meta fica visível sem separar dinheiro do valor livre.' }
    ], allocation.protected ? 'yes' : 'no');
    const name = textField('Nome', allocation.name);
    const amount = moneyField('Valor separado');
    amount.value = centsToInput(allocation.amount);
    const target = moneyField('Objetivo total');
    if (allocation.targetAmount !== undefined)
        target.value = centsToInput(allocation.targetAmount);
    const goalDate = textField('Prazo', allocation.goalDate ?? '', 'date');
    const description = textField('Descrição', allocation.description ?? '');
    const form = el('form', 'form-stack', [labeledField('Nome', name), labeledField('Valor separado', amount), labeledField('Objetivo total (opcional)', target),
        labeledField('Prazo (opcional)', goalDate), protection.element, labeledField('Descrição', description)]);
    const save = submitButton('Salvar alterações');
    form.append(save);
    const close = showSheet('Editar meta ou reserva', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const protectedChoice = protection.getValue();
        if (!protectedChoice)
            return;
        save.disabled = true;
        void updateAllocationDetails(context.repositories.allocations, context.repositories.accounts, context.repositories.transactions, context.lifecycle, {
            profileId: context.profile.id, allocationId: allocation.id, name: name.value, amount: amount.value,
            ...(target.value ? { targetAmount: target.value } : {}), ...(goalDate.value ? { goalDate: goalDate.value } : {}),
            protected: protectedChoice === 'yes', ...(description.value.trim() ? { description: description.value.trim() } : {})
        }).then(() => done(close, 'Meta ou reserva atualizada.', context)).catch((error) => fail(save, error, 'Falha ao atualizar meta ou reserva.'));
    });
}
export async function openEditRecurrenceSheet(context, recurrence) {
    const accounts = await accountOptions(context);
    const account = selectorField('Conta associada', [{ value: '', label: 'Sem conta definida' }, ...accounts], recurrence.accountId ?? '');
    const priority = selectorField('Importância', [
        { value: 'essential', label: 'Essencial' }, { value: 'flexible', label: 'Flexível' }
    ], recurrence.priority ?? 'essential');
    const name = textField('O que é?', recurrence.name);
    const amount = moneyField('Valor');
    amount.value = centsToInput(recurrence.amount);
    const day = textField('Dia do mês', String(recurrence.dayOfMonth));
    day.inputMode = 'numeric';
    const end = textField('Termina em');
    end.type = 'month';
    end.value = recurrence.endMonth ?? '';
    const note = textField('Observação', recurrence.note ?? '');
    const warning = el('div', 'inline-warning', [`As alterações valem daqui para frente. Os meses já registrados desde ${recurrence.startMonth} não serão alterados.`]);
    const advanced = el('details', 'form-disclosure', [
        el('summary', 'form-disclosure-summary', [
            el('span', '', [el('strong', '', ['Mais detalhes']), el('small', '', ['Conta, importância e término opcional.'])]),
            el('span', 'form-disclosure-chevron', [icon('chevron', 'form-disclosure-chevron-icon')])
        ]),
        el('div', 'form-disclosure-content form-stack', [priority.element, account.element, labeledField('Termina em (opcional)', end), labeledField('Observação', note), warning])
    ]);
    const form = el('form', 'form-stack', [
        labeledField('O que é?', name),
        labeledField('Valor', amount),
        labeledField('Dia do mês', day),
        advanced
    ]);
    const save = submitButton('Salvar alterações');
    form.append(save);
    const close = showSheet('Editar compromisso', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        save.disabled = true;
        void updateRecurrenceDetails(context.repositories.recurrences, context.repositories.accounts, context.lifecycle, {
            profileId: context.profile.id, recurrenceId: recurrence.id, name: name.value, amount: amount.value, dayOfMonth: Number(day.value),
            ...(end.value ? { endMonth: end.value } : {}), ...(priority.getValue() ? { priority: priority.getValue() } : {}),
            ...(note.value.trim() ? { note: note.value.trim() } : {}), ...(account.getValue() ? { accountId: account.getValue() } : {})
        }).then(() => done(close, 'Compromisso atualizado.', context)).catch((error) => fail(save, error, 'Falha ao atualizar recorrência.'));
    });
}
function submitButton(label) {
    const button = el('button', 'btn primary full-width', [label]);
    button.type = 'submit';
    return button;
}
function done(close, message, context) {
    close();
    showToast(message, 'success');
    context.onChanged();
}
function fail(button, error, fallback) {
    button.disabled = false;
    showToast(error instanceof Error ? error.message : fallback, 'error');
}
