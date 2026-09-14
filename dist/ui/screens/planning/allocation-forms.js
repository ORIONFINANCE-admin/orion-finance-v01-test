import { createAllocation } from '../../../application/allocations/create-allocation.js';
import { el } from '../../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions } from './shared.js';
export async function openCreateAllocationSheet(context) {
    const accounts = await accountOptions(context);
    if (accounts.length === 0) {
        showToast('Cadastre uma conta antes de criar alocações.', 'error');
        return;
    }
    const account = selectorField('Conta', accounts, accounts[0]?.value ?? null);
    const name = textField('Nome');
    name.placeholder = 'Ex.: Reserva mínima';
    const amount = moneyField('Valor alocado');
    const target = moneyField('Meta');
    target.placeholder = 'Opcional';
    const goalDate = textField('Prazo', '', 'date');
    const protection = selectorField('Proteção', [
        { value: 'yes', label: 'Protegido', description: 'Não considerar livre para decidir' },
        { value: 'no', label: 'Flexível', description: 'Ainda é uma finalidade, mas pode ser revisto' }
    ], 'yes');
    const form = el('form', 'form-stack', [account.element, labeledField('Nome', name), labeledField('Valor', amount),
        labeledField('Meta', target), labeledField('Prazo', goalDate), protection.element]);
    const save = el('button', 'btn primary full-width', ['Criar alocação']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Nova alocação', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const accountId = account.getValue();
        const protectedChoice = protection.getValue();
        if (!accountId || !protectedChoice)
            return;
        save.disabled = true;
        void createAllocation(context.repositories.allocations, context.repositories.accounts, context.repositories.transactions, {
            profileId: context.profile.id, accountId, name: name.value, amount: amount.value,
            ...(target.value ? { targetAmount: target.value } : {}), ...(goalDate.value ? { goalDate: goalDate.value } : {}),
            protected: protectedChoice === 'yes'
        }).then(() => { close(); showToast('Alocação criada.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao criar alocação.', 'error'); });
    });
}
