import { updateManualTransaction } from '../../application/transactions/update-manual-transaction.js';
import { el } from '../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../components/fields.js';
import { showSheet } from '../components/sheets.js';
import { showToast } from '../components/feedback.js';
const EXPENSE_CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Assinaturas', 'Lazer', 'Educação', 'Outros'];
const INCOME_CATEGORIES = ['Salário', 'Benefício', 'Rendimento', 'Venda', 'Reembolso', 'Outros'];
const PAYMENT_METHODS = [
    { value: 'pix', label: 'Pix' }, { value: 'debit', label: 'Débito' }, { value: 'cash', label: 'Dinheiro' },
    { value: 'credit-rail', label: 'Crédito em saldo/benefício' }, { value: 'credit-card', label: 'Cartão de crédito' }, { value: 'other', label: 'Outro' }
];
function centsToInput(value) { return (value / 100).toFixed(2).replace('.', ','); }
export async function openEditTransactionSheet(repositories, profile, mutations, transaction, onChanged) {
    if (transaction.kind !== 'expense' && transaction.kind !== 'income' && transaction.kind !== 'yield' && transaction.kind !== 'transfer') {
        showToast('Este registro possui vínculo especializado e não é editado por este fluxo.', 'error');
        return;
    }
    const [accountsRaw, cardsRaw] = await Promise.all([
        repositories.accounts.listByProfile(profile.id), repositories.creditCards.listByProfile(profile.id)
    ]);
    const accounts = accountsRaw.filter((item) => item.active);
    const cards = cardsRaw.filter((item) => item.active);
    const accountOptions = accounts.map((item) => ({ value: item.id, label: item.name }));
    const amount = moneyField('Valor');
    amount.value = centsToInput(transaction.amount);
    const description = textField('Descrição', transaction.description ?? '');
    const date = textField('Data', transaction.date, 'date');
    const form = el('form', 'form-stack', [labeledField('Valor', amount), labeledField('Descrição', description), labeledField('Data', date)]);
    const close = showSheet('Editar movimentação', form);
    if (transaction.kind === 'transfer') {
        const origin = selectorField('Origem', accountOptions, transaction.fromAccountId);
        const destination = selectorField('Destino', accountOptions, transaction.toAccountId);
        form.append(origin.element, destination.element);
        attachSubmit(form, async () => {
            const from = origin.getValue();
            const to = destination.getValue();
            if (!from || !to)
                throw new TypeError('Selecione origem e destino.');
            await updateManualTransaction(repositories.transactions, repositories.accounts, repositories.creditCards, mutations, {
                kind: 'transfer', profileId: profile.id, transactionId: transaction.id, amount: amount.value, date: date.value,
                description: description.value, fromAccountId: from, toAccountId: to
            });
        }, close, onChanged);
        return;
    }
    if (transaction.kind === 'income' || transaction.kind === 'yield') {
        const account = selectorField('Conta', accountOptions, transaction.accountId);
        const category = selectorField('Categoria', INCOME_CATEGORIES.map((value) => ({ value, label: value })), transaction.categoryId ?? (transaction.kind === 'yield' ? 'Rendimento' : 'Outros'));
        form.append(account.element, category.element);
        attachSubmit(form, async () => {
            const accountId = account.getValue();
            const categoryId = category.getValue();
            if (!accountId || !categoryId)
                throw new TypeError('Revise conta e categoria.');
            await updateManualTransaction(repositories.transactions, repositories.accounts, repositories.creditCards, mutations, {
                kind: categoryId === 'Rendimento' ? 'yield' : 'income', profileId: profile.id, transactionId: transaction.id,
                amount: amount.value, date: date.value, description: description.value, categoryId, accountId
            });
        }, close, onChanged);
        return;
    }
    if (transaction.kind !== 'expense') {
        showToast('Esta movimentação não pode ser editada por este fluxo.', 'error');
        close();
        return;
    }
    let paymentChoice = transaction.settlement.kind === 'credit-card' ? 'credit-card' : transaction.settlement.method;
    let accountId = transaction.settlement.kind === 'account' ? transaction.settlement.accountId : (accountOptions[0]?.value ?? null);
    let cardId = transaction.settlement.kind === 'credit-card' ? transaction.settlement.creditCardId : (cards[0]?.id ?? null);
    const payment = selectorField('Meio de pagamento', PAYMENT_METHODS, paymentChoice);
    const category = selectorField('Categoria', EXPENSE_CATEGORIES.map((value) => ({ value, label: value })), transaction.categoryId ?? 'Outros');
    const settlementHost = el('div', 'dynamic-field-host');
    form.append(payment.element, settlementHost, category.element);
    const syncSettlement = () => {
        paymentChoice = payment.getValue() ?? 'pix';
        settlementHost.replaceChildren();
        if (paymentChoice === 'credit-card') {
            if (cards.length === 0) {
                cardId = null;
                settlementHost.append(el('div', 'inline-warning', ['Nenhum cartão ativo disponível.']));
                return;
            }
            const card = selectorField('Cartão', cards.map((item) => ({ value: item.id, label: item.name })), cardId);
            card.element.addEventListener('selectorchange', () => { cardId = card.getValue(); });
            settlementHost.append(card.element);
            return;
        }
        const account = selectorField('Conta', accountOptions, accountId);
        account.element.addEventListener('selectorchange', () => { accountId = account.getValue(); });
        settlementHost.append(account.element);
    };
    payment.element.addEventListener('selectorchange', syncSettlement);
    syncSettlement();
    attachSubmit(form, async () => {
        const categoryId = category.getValue();
        if (!categoryId)
            throw new TypeError('Selecione a categoria.');
        if (paymentChoice === 'credit-card') {
            if (!cardId)
                throw new TypeError('Selecione um cartão.');
            await updateManualTransaction(repositories.transactions, repositories.accounts, repositories.creditCards, mutations, {
                kind: 'expense-card', profileId: profile.id, transactionId: transaction.id, amount: amount.value, date: date.value,
                description: description.value, categoryId, creditCardId: cardId
            });
            return;
        }
        if (!accountId)
            throw new TypeError('Selecione uma conta.');
        await updateManualTransaction(repositories.transactions, repositories.accounts, repositories.creditCards, mutations, {
            kind: 'expense-account', profileId: profile.id, transactionId: transaction.id, amount: amount.value, date: date.value,
            description: description.value, categoryId, accountId, paymentMethod: paymentChoice
        });
    }, close, onChanged);
}
function attachSubmit(form, work, close, onChanged) {
    const save = el('button', 'btn primary full-width', ['Salvar alterações']);
    save.type = 'submit';
    form.append(save);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        save.disabled = true;
        void work().then(() => { close(); showToast('Movimentação atualizada.', 'success'); onChanged(); })
            .catch((error) => { save.disabled = false; showToast(error instanceof Error ? error.message : 'Não foi possível atualizar.', 'error'); });
    });
}
