import { formatBRL, ZERO_CENTS } from '../../../domain/money/money.js';
import { effectiveRecurrenceStatus } from '../../../domain/recurrences/position.js';
import { el } from '../../dom.js';
import { confirmEntityDeactivation, showEntityActions } from '../../components/entity-actions.js';
import { openCreateCardSheet, openPayCardSheet } from './card-forms.js';
import { openCreateDebtSheet, openPayDebtSheet } from './debt-forms.js';
import { openCreateAssetSheet, openAssetOperationSheet } from './asset-forms.js';
import { openCreateAllocationSheet } from './allocation-forms.js';
import { confirmIgnoreRecurrenceMonth, confirmReconsiderRecurrenceMonth, confirmUnlinkRecurrencePayment, openCreateRecurrenceSheet, openLinkRecurrencePaymentSheet } from './recurrence-forms.js';
import { openEditAllocationSheet, openEditAssetSheet, openEditCardSheet, openEditDebtSheet, openEditRecurrenceSheet } from './lifecycle-forms.js';
function actionButton(label, onClick, className = 'text-action') {
    const button = el('button', className, [label]);
    button.type = 'button';
    button.addEventListener('click', onClick);
    return button;
}
function sectionHeader(title, action, support) {
    return el('div', 'section-title-row', [
        el('div', '', [el('h2', '', [title]), support ? el('p', 'section-support', [support]) : null]),
        action
    ]);
}
function empty(text) {
    return el('div', 'empty-card compact-empty', [el('span', '', [text])]);
}
function actions(...buttons) {
    return el('div', 'module-actions', buttons);
}
export function renderCardsSection(context, position) {
    const section = el('section', 'section-block module-section', [sectionHeader('Cartões', actionButton('+ Cartão', () => { void openCreateCardSheet(context); }))]);
    if (position.cards.length === 0) {
        section.append(empty('Nenhum cartão de crédito cadastrado.'));
        return section;
    }
    const list = el('div', 'module-list');
    for (const item of position.cards) {
        const value = formatBRL(item.position.openLiability);
        const pay = actionButton('Pagar', () => { void openPayCardSheet(context, item.card.id, value); });
        if (item.position.openLiability <= ZERO_CENTS)
            pay.disabled = true;
        const more = actionButton('•••', () => showEntityActions(item.card.name, () => { void openEditCardSheet(context, item.card); }, () => confirmEntityDeactivation(context.lifecycle, context.profile.id, 'credit-card', item.card.id, 'Cartão', context.onChanged)), 'icon-text-action');
        list.append(el('article', 'module-row', [
            el('div', 'module-copy', [el('strong', '', [item.card.name]), el('small', '', [item.card.guaranteeAssetId ? 'Crédito com garantia vinculada' : 'Cartão de crédito'])]),
            el('div', 'module-value', [el('small', '', ['FATURA']), el('strong', item.position.openLiability > ZERO_CENTS ? 'negative-text' : 'positive-text', [value])]),
            actions(pay, more)
        ]));
    }
    section.append(list);
    return section;
}
export function renderDebtsSection(context, position) {
    const section = el('section', 'section-block module-section', [sectionHeader('Dívidas', actionButton('+ Dívida', () => openCreateDebtSheet(context)), 'Veja quanto ainda falta pagar e registre os pagamentos conforme acontecerem.')]);
    if (position.debts.length === 0) {
        section.append(empty('Nenhuma dívida cadastrada.'));
        return section;
    }
    const list = el('div', 'module-list');
    for (const item of position.debts) {
        const value = formatBRL(item.position.outstanding);
        const pay = actionButton('Pagar', () => { void openPayDebtSheet(context, item.debt.id, value); });
        if (item.position.outstanding <= ZERO_CENTS)
            pay.disabled = true;
        const more = actionButton('•••', () => showEntityActions(item.debt.name, () => openEditDebtSheet(context, item.debt), () => confirmEntityDeactivation(context.lifecycle, context.profile.id, 'debt', item.debt.id, 'Dívida', context.onChanged)), 'icon-text-action');
        list.append(el('article', 'module-row', [
            el('div', 'module-copy', [el('strong', '', [item.debt.name]), el('small', '', [item.position.settlementOffer !== undefined ? `Oferta para quitar: ${formatBRL(item.position.settlementOffer)}` : (item.debt.creditor?.trim() || 'Dívida em aberto')])]),
            el('div', 'module-value', [el('small', '', ['SALDO']), el('strong', item.position.outstanding > ZERO_CENTS ? 'negative-text' : 'positive-text', [value])]),
            actions(pay, more)
        ]));
    }
    section.append(list);
    return section;
}
export function renderAssetsSection(context, position) {
    const section = el('section', 'section-block module-section', [sectionHeader('Ativos', actionButton('+ Ativo', () => openCreateAssetSheet(context)))]);
    if (position.assets.length === 0) {
        section.append(empty('Garantias e outros bens financeiros aparecem aqui.'));
        return section;
    }
    const list = el('div', 'module-list');
    for (const item of position.assets) {
        const move = actionButton('Movimentar', () => { void openAssetOperationSheet(context, item.asset.id); });
        const more = actionButton('•••', () => showEntityActions(item.asset.name, () => openEditAssetSheet(context, item.asset), () => confirmEntityDeactivation(context.lifecycle, context.profile.id, 'asset', item.asset.id, 'Ativo', context.onChanged)), 'icon-text-action');
        list.append(el('article', 'module-row', [
            el('div', 'module-copy', [el('strong', '', [item.asset.name]), el('small', '', [item.asset.kind === 'guarantee' ? 'Garantia · não é saldo disponível' : `Liquidez: ${item.asset.liquidity}`])]),
            el('div', 'module-value', [el('small', '', ['VALOR ATUAL']), el('strong', 'positive-text', [formatBRL(item.position.currentValue)])]),
            actions(move, more)
        ]));
    }
    section.append(list);
    return section;
}
export function renderAllocationsSection(context, position) {
    const section = el('section', 'section-block module-section', [sectionHeader('Metas e reservas', actionButton('+ Meta', () => { void openCreateAllocationSheet(context); }), 'Separe dinheiro para objetivos sem transformar isso em despesa.')]);
    if (position.allocations.length === 0) {
        section.append(empty('Você ainda não separou dinheiro para nenhuma meta ou reserva.'));
        return section;
    }
    const list = el('div', 'module-list');
    for (const item of position.allocations) {
        const more = actionButton('•••', () => showEntityActions(item.name, () => openEditAllocationSheet(context, item), () => confirmEntityDeactivation(context.lifecycle, context.profile.id, 'allocation', item.id, 'Meta ou reserva', context.onChanged)), 'icon-text-action');
        const goalSummary = item.targetAmount !== undefined
            ? `Objetivo: ${formatBRL(item.targetAmount)}${item.goalDate ? ` · até ${formatGoalDate(item.goalDate)}` : ''}`
            : (item.protected ? 'Valor reservado para este objetivo' : 'Acompanhamento sem reduzir o valor livre');
        list.append(el('article', 'module-row', [
            el('div', 'module-copy', [el('strong', '', [item.name]), el('small', '', [goalSummary])]),
            el('div', 'module-value', [el('small', '', ['SEPARADO']), el('strong', '', [formatBRL(item.amount)])]),
            actions(more)
        ]));
    }
    section.append(list);
    return section;
}
function formatGoalDate(value) {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
}
export function renderRecurrencesSection(context, position, now = new Date()) {
    const section = el('section', 'section-block module-section', [sectionHeader('Próximos compromissos', actionButton('+ Compromisso', () => { void openCreateRecurrenceSheet(context); }), 'Contas e recebimentos que você espera neste mês.')]);
    if (position.recurrences.length === 0) {
        section.append(empty('Adicione contas ou recebimentos que costumam se repetir. Eles só viram movimentação quando realmente acontecerem.'));
        return section;
    }
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = `${month}-${String(now.getDate()).padStart(2, '0')}`;
    const list = el('div', 'module-list');
    for (const recurrence of position.recurrences) {
        const monthState = position.recurrenceMonths.find((item) => item.recurrenceId === recurrence.id && item.month === month);
        const status = effectiveRecurrenceStatus(recurrence, month, monthState, today);
        const statusLabel = status === 'planned' ? 'Previsto' : status === 'overdue' ? 'Atrasado' : status === 'paid' ? 'Pago' : 'Ignorado';
        const monthAction = status === 'ignored'
            ? actionButton('Voltar a considerar', () => confirmReconsiderRecurrenceMonth(context, recurrence.id, month))
            : status === 'paid'
                ? actionButton('Pago', () => { })
                : actionButton('Ignorar', () => confirmIgnoreRecurrenceMonth(context, recurrence.id, month));
        if (status === 'paid')
            monthAction.disabled = true;
        const paymentAction = status === 'paid'
            ? [{
                    label: recurrence.kind === 'expense' ? 'Desvincular pagamento' : 'Desvincular recebimento',
                    description: 'Preserva a movimentação e devolve o compromisso ao planejamento do mês.',
                    symbol: '↶',
                    onSelect: () => confirmUnlinkRecurrencePayment(context, recurrence, month)
                }]
            : status === 'ignored'
                ? []
                : [{
                        label: recurrence.kind === 'expense' ? 'Vincular pagamento' : 'Vincular recebimento',
                        description: 'Liga uma movimentação real compatível sem criar dupla contagem.',
                        symbol: '↔',
                        onSelect: () => { void openLinkRecurrencePaymentSheet(context, recurrence, month); }
                    }];
        const more = actionButton('•••', () => showEntityActions(recurrence.name, () => { void openEditRecurrenceSheet(context, recurrence); }, () => confirmEntityDeactivation(context.lifecycle, context.profile.id, 'recurrence', recurrence.id, 'Compromisso', context.onChanged), paymentAction), 'icon-text-action');
        list.append(el('article', 'module-row', [
            el('div', 'module-copy', [el('strong', '', [recurrence.name]), el('small', '', [`Dia ${recurrence.dayOfMonth} · ${statusLabel}`])]),
            el('div', 'module-value', [el('small', '', [recurrence.kind === 'expense' ? 'A PAGAR' : 'A RECEBER']), el('strong', recurrence.kind === 'expense' ? 'negative-text' : 'positive-text', [formatBRL(recurrence.amount)])]),
            actions(monthAction, more)
        ]));
    }
    section.append(list);
    return section;
}
