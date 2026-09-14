import { createRecurrence } from '../../../application/recurrences/create-recurrence.js';
import { updateRecurrenceMonth } from '../../../application/recurrences/update-recurrence-month.js';
import { el } from '../../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showConfirmation, showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions, currentMonth } from './shared.js';
export async function openCreateRecurrenceSheet(context) {
    const accounts = await accountOptions(context);
    const kind = selectorField('Tipo', [{ value: 'expense', label: 'Despesa prevista' }, { value: 'income', label: 'Receita prevista' }], 'expense');
    const account = selectorField('Conta associada', [{ value: '', label: 'Sem conta definida' }, ...accounts], '');
    const priority = selectorField('Prioridade', [{ value: 'essential', label: 'Essencial' }, { value: 'flexible', label: 'Flexível' }], 'essential');
    const name = textField('Nome');
    name.placeholder = 'Ex.: Internet';
    const amount = moneyField('Valor previsto');
    const day = textField('Dia do mês');
    day.inputMode = 'numeric';
    day.placeholder = '10';
    const start = textField('Mês inicial');
    start.type = 'month';
    start.value = currentMonth();
    const end = textField('Mês final');
    end.type = 'month';
    const note = textField('Observação');
    const form = el('form', 'form-stack', [kind.element, priority.element, labeledField('Nome', name), labeledField('Valor previsto', amount),
        labeledField('Dia de vencimento', day), labeledField('Mês inicial', start), labeledField('Mês final (opcional)', end), account.element, labeledField('Observação', note)]);
    const save = el('button', 'btn primary full-width', ['Salvar recorrência']);
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
        }).then(() => { close(); showToast('Recorrência criada.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao criar recorrência.', 'error'); });
    });
}
export function confirmIgnoreRecurrenceMonth(context, recurrenceId, month) {
    showConfirmation('Ignorar neste mês', 'A recorrência continuará existindo nos próximos meses. Nenhum saldo será alterado.', 'Ignorar mês', () => {
        void updateRecurrenceMonth(context.repositories.recurrenceMonths, context.repositories.recurrences, context.repositories.transactions, {
            profileId: context.profile.id, recurrenceId, month, status: 'ignored'
        }).then(() => { showToast('Recorrência ignorada neste mês.', 'success'); context.onChanged(); })
            .catch((error) => showToast(error instanceof Error ? error.message : 'Falha ao atualizar recorrência.', 'error'));
    });
}
