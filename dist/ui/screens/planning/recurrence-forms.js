import { createRecurrence } from '../../../application/recurrences/create-recurrence.js';
import { updateRecurrenceMonth } from '../../../application/recurrences/update-recurrence-month.js';
import { linkRecurrencePayment, listRecurrencePaymentCandidates, unlinkRecurrencePayment } from '../../../application/recurrences/payment-link.js';
import { formatBRL } from '../../../domain/money/money.js';
import { el } from '../../dom.js';
import { icon } from '../../icons.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showConfirmation, showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions, currentMonth } from './shared.js';
export async function openCreateRecurrenceSheet(context) {
    const accounts = await accountOptions(context);
    const kind = selectorField('Este compromisso é', [
        { value: 'expense', label: 'Conta a pagar' },
        { value: 'income', label: 'Dinheiro a receber' }
    ], 'expense');
    const account = selectorField('Conta associada', [{ value: '', label: 'Sem conta definida' }, ...accounts], '');
    const priority = selectorField('Importância', [
        { value: 'essential', label: 'Essencial' },
        { value: 'flexible', label: 'Flexível' }
    ], 'essential');
    const name = textField('O que é?');
    name.placeholder = 'Ex.: Internet';
    const amount = moneyField('Valor');
    const day = textField('Dia do mês');
    day.inputMode = 'numeric';
    day.placeholder = '10';
    const start = textField('Começa em');
    start.type = 'month';
    start.value = currentMonth();
    const end = textField('Termina em');
    end.type = 'month';
    const note = textField('Observação');
    const advanced = el('details', 'form-disclosure', [
        el('summary', 'form-disclosure-summary', [
            el('span', '', [el('strong', '', ['Mais detalhes']), el('small', '', ['Conta, período e outras opções.'])]),
            el('span', 'form-disclosure-chevron', [icon('chevron', 'form-disclosure-chevron-icon')])
        ]),
        el('div', 'form-disclosure-content form-stack', [priority.element, account.element, labeledField('Começa em', start), labeledField('Termina em (opcional)', end), labeledField('Observação', note)])
    ]);
    const form = el('form', 'form-stack', [
        el('p', 'form-support', ['Para começar, informe o que é, o valor e o dia do mês.']),
        kind.element,
        labeledField('O que é?', name),
        labeledField('Valor', amount),
        labeledField('Dia do mês', day),
        advanced
    ]);
    const save = el('button', 'btn primary full-width', ['Salvar compromisso']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Novo compromisso', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const recurrenceKind = kind.getValue();
        if (!recurrenceKind)
            return;
        save.disabled = true;
        void createRecurrence(context.repositories.recurrences, context.repositories.accounts, {
            profileId: context.profile.id, name: name.value, kind: recurrenceKind, amount: amount.value,
            dayOfMonth: Number(day.value), startMonth: start.value, ...(end.value ? { endMonth: end.value } : {}),
            ...(priority.getValue() ? { priority: priority.getValue() } : {}),
            ...(note.value.trim() ? { note: note.value.trim() } : {}),
            ...(account.getValue() ? { accountId: account.getValue() } : {})
        }).then(() => { close(); showToast('Compromisso criado.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao criar compromisso.', 'error'); });
    });
}
export function confirmIgnoreRecurrenceMonth(context, recurrenceId, month) {
    showConfirmation('Ignorar neste mês', 'O compromisso continuará existindo nos próximos meses. Nenhum saldo será alterado.', 'Ignorar mês', () => {
        void updateRecurrenceMonth(context.repositories.recurrenceMonths, context.repositories.recurrences, context.repositories.transactions, {
            profileId: context.profile.id, recurrenceId, month, status: 'ignored'
        }).then(() => { showToast('Compromisso ignorado neste mês.', 'success'); context.onChanged(); })
            .catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao atualizar compromisso.', 'error'));
    });
}
export function confirmReconsiderRecurrenceMonth(context, recurrenceId, month) {
    showConfirmation('Voltar a considerar neste mês', 'O compromisso volta ao planejamento deste mês sem criar movimentação financeira.', 'Voltar a considerar', () => {
        void updateRecurrenceMonth(context.repositories.recurrenceMonths, context.repositories.recurrences, context.repositories.transactions, {
            profileId: context.profile.id, recurrenceId, month, status: 'planned'
        }).then(() => { showToast('Compromisso voltou ao planejamento deste mês.', 'success'); context.onChanged(); })
            .catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao atualizar compromisso.', 'error'));
    });
}
export async function openLinkRecurrencePaymentSheet(context, recurrence, month) {
    const candidates = await listRecurrencePaymentCandidates(context.repositories.recurrences, context.repositories.recurrenceMonths, context.repositories.transactions, { profileId: context.profile.id, recurrenceId: recurrence.id, month });
    const content = el('div', 'action-menu');
    let close = () => undefined;
    if (candidates.length === 0) {
        content.append(el('div', 'inline-warning', [
            'Nenhuma movimentação compatível encontrada. Registre primeiro o fato pelo botão + com o mesmo valor, mês e conta e depois volte para vincular.'
        ]));
    }
    else {
        for (const transaction of candidates) {
            const row = el('button', 'action-menu-row', [
                el('span', 'action-menu-symbol', [recurrence.kind === 'expense' ? '✓' : '↗']),
                el('span', 'action-menu-copy', [
                    el('strong', '', [transaction.description?.trim() || (recurrence.kind === 'expense' ? 'Pagamento' : 'Recebimento')]),
                    el('small', '', [`${formatDate(transaction.date)} · ${formatBRL(transaction.amount)}`])
                ])
            ]);
            row.type = 'button';
            row.addEventListener('click', () => {
                showConfirmation(recurrence.kind === 'expense' ? 'Vincular pagamento?' : 'Vincular recebimento?', 'A movimentação existente continuará sendo o único fato financeiro. O compromisso deixará de ser apenas previsto, sem criar valor em duplicidade.', 'Vincular', () => {
                    void linkRecurrencePayment(context.repositories.recurrenceMonths, context.repositories.recurrences, context.repositories.transactions, { profileId: context.profile.id, recurrenceId: recurrence.id, month, transactionId: transaction.id }).then(() => {
                        close();
                        showToast(recurrence.kind === 'expense' ? 'Pagamento vinculado.' : 'Recebimento vinculado.', 'success');
                        context.onChanged();
                    }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao vincular movimentação.', 'error'));
                });
            });
            content.append(row);
        }
    }
    close = showSheet(recurrence.kind === 'expense' ? 'Vincular pagamento' : 'Vincular recebimento', content);
}
export function confirmUnlinkRecurrencePayment(context, recurrence, month) {
    showConfirmation(recurrence.kind === 'expense' ? 'Desvincular pagamento?' : 'Desvincular recebimento?', 'A movimentação financeira continuará existindo. O compromisso volta ao planejamento deste mês até ser vinculado novamente ou ignorado.', 'Desvincular', () => {
        void unlinkRecurrencePayment(context.repositories.recurrenceMonths, context.repositories.recurrences, context.repositories.transactions, { profileId: context.profile.id, recurrenceId: recurrence.id, month }).then(() => {
            showToast('Vínculo removido. A movimentação foi preservada.', 'success');
            context.onChanged();
        }).catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao remover vínculo.', 'error'));
    });
}
function formatDate(value) {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
}
