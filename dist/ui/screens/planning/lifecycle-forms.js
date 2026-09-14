import { updateCreditCardDetails } from '../../../application/credit-cards/update-credit-card.js';
import { updateDebtDetails } from '../../../application/debts/update-debt.js';
import { updateAssetDetails } from '../../../application/assets/update-asset.js';
import { updateAllocationDetails } from '../../../application/allocations/update-allocation.js';
import { updateRecurrenceDetails } from '../../../application/recurrences/update-recurrence.js';
import { el } from '../../dom.js';
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
    const priority = selectorField('Prioridade', [
        { value: 'high', label: 'Alta' }, { value: 'medium', label: 'Média' }, { value: 'low', label: 'Baixa' }
    ], debt.priority ?? 'medium');
    const name = textField('Nome', debt.name);
    const creditor = textField('Credor', debt.creditor ?? '');
    const settlement = moneyField('Oferta de quitação');
    if (debt.settlementOffer !== undefined)
        settlement.value = centsToInput(debt.settlementOffer);
    const expiry = textField('Validade da oferta', debt.offerExpiry ?? '', 'date');
    const note = textField('Observação', debt.note ?? '');
    const warning = el('div', 'inline-warning', ['O saldo-base e as taxas históricas não são reescritos por esta edição. Pagamentos continuam sendo fatos separados.']);
    const form = el('form', 'form-stack', [priority.element, labeledField('Nome', name), labeledField('Credor', creditor),
        labeledField('Oferta de quitação', settlement), labeledField('Validade da oferta', expiry), labeledField('Observação', note), warning]);
    const save = submitButton('Salvar alterações');
    form.append(save);
    const close = showSheet('Editar dívida', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        save.disabled = true;
        void updateDebtDetails(context.repositories.debts, context.lifecycle, {
            profileId: context.profile.id, debtId: debt.id, name: name.value,
            ...(creditor.value.trim() ? { creditor: creditor.value.trim() } : {}),
            ...(settlement.value ? { settlementOffer: settlement.value } : {}),
            ...(expiry.value ? { offerExpiry: expiry.value } : {}),
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
    const protection = selectorField('Proteção', [
        { value: 'yes', label: 'Protegido' }, { value: 'no', label: 'Flexível' }
    ], allocation.protected ? 'yes' : 'no');
    const name = textField('Nome', allocation.name);
    const amount = moneyField('Valor');
    amount.value = centsToInput(allocation.amount);
    const target = moneyField('Meta');
    if (allocation.targetAmount !== undefined)
        target.value = centsToInput(allocation.targetAmount);
    const goalDate = textField('Prazo', allocation.goalDate ?? '', 'date');
    const description = textField('Descrição', allocation.description ?? '');
    const form = el('form', 'form-stack', [labeledField('Nome', name), labeledField('Valor', amount), labeledField('Meta', target),
        labeledField('Prazo', goalDate), protection.element, labeledField('Descrição', description)]);
    const save = submitButton('Salvar alterações');
    form.append(save);
    const close = showSheet('Editar alocação', form);
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
        }).then(() => done(close, 'Alocação atualizada.', context)).catch((error) => fail(save, error, 'Falha ao atualizar alocação.'));
    });
}
export async function openEditRecurrenceSheet(context, recurrence) {
    const accounts = await accountOptions(context);
    const account = selectorField('Conta associada', [{ value: '', label: 'Sem conta definida' }, ...accounts], recurrence.accountId ?? '');
    const priority = selectorField('Prioridade', [
        { value: 'essential', label: 'Essencial' }, { value: 'flexible', label: 'Flexível' }
    ], recurrence.priority ?? 'essential');
    const name = textField('Nome', recurrence.name);
    const amount = moneyField('Valor previsto');
    amount.value = centsToInput(recurrence.amount);
    const day = textField('Dia do mês', String(recurrence.dayOfMonth));
    day.inputMode = 'numeric';
    const end = textField('Mês final');
    end.type = 'month';
    end.value = recurrence.endMonth ?? '';
    const note = textField('Observação', recurrence.note ?? '');
    const warning = el('div', 'inline-warning', [`Início preservado em ${recurrence.startMonth}. A edição vale para a recorrência daqui em diante sem reescrever meses já registrados.`]);
    const form = el('form', 'form-stack', [priority.element, labeledField('Nome', name), labeledField('Valor previsto', amount),
        labeledField('Dia de vencimento', day), labeledField('Mês final (opcional)', end), account.element, labeledField('Observação', note), warning]);
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
        }).then(() => done(close, 'Recorrência atualizada.', context)).catch((error) => fail(save, error, 'Falha ao atualizar recorrência.'));
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
