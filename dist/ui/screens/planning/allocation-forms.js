import { createAllocation } from '../../../application/allocations/create-allocation.js';
import { el } from '../../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showSheet } from '../../components/sheets.js';
import { showToast } from '../../components/feedback.js';
import { accountOptions } from './shared.js';
export async function openCreateAllocationSheet(context) {
    const accounts = await accountOptions(context);
    if (accounts.length === 0) {
        showToast('Cadastre uma conta antes de criar uma meta ou reserva.', 'error');
        return;
    }
    const defaultAccount = accounts.length === 1 ? accounts[0]?.value ?? null : null;
    const account = selectorField('Onde esse dinheiro está', accounts, defaultAccount);
    const name = textField('Nome');
    name.placeholder = 'Ex.: Reserva de emergência';
    const amount = moneyField('Valor separado');
    const target = moneyField('Objetivo total');
    target.placeholder = 'Opcional';
    const goalDate = textField('Prazo', '', 'date');
    const protection = selectorField('Quer reservar esse valor para não usar em outras coisas?', [
        { value: 'yes', label: 'Sim, deixar separado', description: 'Esse valor deixa de aparecer como dinheiro livre para usar.' },
        { value: 'no', label: 'Não, só acompanhar', description: 'A meta fica visível sem separar dinheiro do valor livre.' }
    ], 'yes');
    const form = el('form', 'form-stack', [account.element, labeledField('Nome', name), labeledField('Valor separado', amount),
        labeledField('Objetivo total (opcional)', target), labeledField('Prazo (opcional)', goalDate), protection.element]);
    const save = el('button', 'btn primary full-width', ['Salvar meta ou reserva']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Nova meta ou reserva', form);
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
        }).then(() => { close(); showToast('Meta ou reserva criada.', 'success'); context.onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Falha ao criar meta ou reserva.', 'error'); });
    });
}
