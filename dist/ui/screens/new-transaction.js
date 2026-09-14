import { createTransaction } from '../../application/transactions/create-transaction.js';
import { recordCardPurchase } from '../../application/credit-cards/record-card-purchase.js';
import { el } from '../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../components/fields.js';
import { showSheet } from '../components/sheets.js';
import { showToast } from '../components/feedback.js';
const PAYMENT_METHODS = [
    { value: 'pix', label: 'Pix', description: 'Liquidação imediata pela conta' },
    { value: 'debit', label: 'Débito', description: 'Débito imediato na conta' },
    { value: 'cash', label: 'Dinheiro', description: 'Pagamento em espécie' },
    { value: 'credit-rail', label: 'Crédito em saldo/benefício', description: 'Trilho crédito sem dívida de cartão' },
    { value: 'credit-card', label: 'Cartão de crédito', description: 'Reconhece despesa e cria obrigação na fatura' },
    { value: 'other', label: 'Outro' }
];
const EXPENSE_CATEGORIES = ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Assinaturas', 'Lazer', 'Educação', 'Outros'];
const INCOME_CATEGORIES = ['Salário', 'Benefício', 'Rendimento', 'Venda', 'Reembolso', 'Outros'];
function todayISO() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export async function openNewTransactionSheet(repositories, profile, onChanged) {
    const [accountsRaw, cardsRaw] = await Promise.all([
        repositories.accounts.listByProfile(profile.id),
        repositories.creditCards.listByProfile(profile.id)
    ]);
    const accounts = accountsRaw.filter((account) => account.active);
    const cards = cardsRaw.filter((card) => card.active);
    if (accounts.length === 0 && cards.length === 0) {
        showToast('Adicione uma conta ou cartão antes de registrar movimentações.', 'error');
        return;
    }
    let kind = 'expense';
    const content = el('div', 'transaction-form-shell');
    const tabs = el('div', 'segmented-control');
    const formHost = el('div');
    content.append(tabs, formHost);
    const close = showSheet('Nova movimentação', content);
    const renderTabs = () => {
        tabs.replaceChildren();
        const items = [
            { value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }, { value: 'transfer', label: 'Transf.' }
        ];
        for (const item of items) {
            const tab = el('button', `segment ${item.value === kind ? 'active' : ''}`, [item.label]);
            tab.type = 'button';
            tab.addEventListener('click', () => { kind = item.value; renderTabs(); renderForm(); });
            tabs.append(tab);
        }
    };
    const renderForm = () => {
        formHost.replaceChildren();
        const form = el('form', 'form-stack');
        const amount = moneyField('Valor');
        const description = textField('Descrição');
        const date = textField('Data', todayISO(), 'date');
        form.append(labeledField('Valor', amount), labeledField('Descrição', description), labeledField('Data', date));
        const accountOptions = accounts.map((account) => ({ value: account.id, label: account.name }));
        if (kind === 'expense')
            renderExpenseFields(form, repositories, profile, accounts[0]?.id ?? null, cards, amount, description, date, close, onChanged);
        else if (kind === 'income')
            renderIncomeFields(form, repositories, profile, accountOptions, amount, description, date, close, onChanged);
        else
            renderTransferFields(form, repositories, profile, accountOptions, amount, description, date, close, onChanged);
        formHost.append(form);
    };
    renderTabs();
    renderForm();
}
function renderExpenseFields(form, repositories, profile, firstAccountId, cards, amount, description, date, close, onChanged) {
    const payment = selectorField('Meio de pagamento', PAYMENT_METHODS, cards.length > 0 && !firstAccountId ? 'credit-card' : 'pix');
    const category = selectorField('Categoria', EXPENSE_CATEGORIES.map((value) => ({ value, label: value })), 'Outros');
    const settlementHost = el('div', 'dynamic-field-host');
    form.append(payment.element, settlementHost, category.element);
    let account = firstAccountId;
    let card = cards[0]?.id ?? null;
    const syncSettlement = () => {
        settlementHost.replaceChildren();
        if (payment.getValue() === 'credit-card') {
            if (cards.length === 0) {
                settlementHost.append(el('div', 'inline-warning', ['Nenhum cartão cadastrado. Adicione um cartão em Planejar.']));
                card = null;
                return;
            }
            const selector = selectorField('Cartão', cards.map((item) => ({ value: item.id, label: item.name })), card);
            selector.element.addEventListener('selectorchange', () => { card = selector.getValue(); });
            settlementHost.append(selector.element);
            return;
        }
        const accountSelector = selectorField('Conta', [], account);
        void repositories.accounts.listByProfile(profile.id).then((items) => {
            const options = items.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name }));
            accountSelector.setOptions(options);
            if (!accountSelector.getValue())
                accountSelector.setValue(options[0]?.value ?? null);
            account = accountSelector.getValue();
        });
        accountSelector.element.addEventListener('selectorchange', () => { account = accountSelector.getValue(); });
        settlementHost.append(accountSelector.element);
    };
    payment.element.addEventListener('selectorchange', syncSettlement);
    syncSettlement();
    attachSubmit(form, async () => {
        const paymentChoice = payment.getValue();
        const categoryId = category.getValue();
        if (!paymentChoice || !categoryId)
            throw new TypeError('Preencha meio de pagamento e categoria.');
        if (paymentChoice === 'credit-card') {
            if (!card)
                throw new TypeError('Selecione um cartão.');
            await recordCardPurchase(repositories.transactions, repositories.creditCards, repositories.accounts, {
                profileId: profile.id, creditCardId: card, amount: amount.value, date: date.value,
                description: description.value || categoryId, categoryId
            });
            return;
        }
        if (!account)
            throw new TypeError('Selecione uma conta.');
        await createTransaction(repositories.transactions, repositories.accounts, {
            kind: 'expense', profileId: profile.id, amount: amount.value, date: date.value,
            description: description.value || categoryId, categoryId, accountId: account, paymentMethod: paymentChoice
        });
    }, close, onChanged);
}
function renderIncomeFields(form, repositories, profile, accountOptions, amount, description, date, close, onChanged) {
    const account = selectorField('Conta de entrada', accountOptions, accountOptions[0]?.value ?? null);
    const category = selectorField('Categoria', INCOME_CATEGORIES.map((value) => ({ value, label: value })), 'Salário');
    form.append(account.element, category.element);
    attachSubmit(form, async () => {
        const accountId = account.getValue();
        const categoryId = category.getValue();
        if (!accountId || !categoryId)
            throw new TypeError('Preencha conta e categoria.');
        await createTransaction(repositories.transactions, repositories.accounts, {
            kind: categoryId === 'Rendimento' ? 'yield' : 'income', profileId: profile.id,
            amount: amount.value, date: date.value, description: description.value || categoryId, categoryId, accountId
        });
    }, close, onChanged);
}
function renderTransferFields(form, repositories, profile, accountOptions, amount, description, date, close, onChanged) {
    const origin = selectorField('Origem', accountOptions, accountOptions[0]?.value ?? null);
    const destination = selectorField('Destino', accountOptions, accountOptions[1]?.value ?? null);
    form.append(origin.element, destination.element);
    attachSubmit(form, async () => {
        const fromAccountId = origin.getValue();
        const toAccountId = destination.getValue();
        if (!fromAccountId || !toAccountId)
            throw new TypeError('Selecione origem e destino.');
        await createTransaction(repositories.transactions, repositories.accounts, {
            kind: 'transfer', profileId: profile.id, amount: amount.value, date: date.value,
            description: description.value || 'Transferência', fromAccountId, toAccountId
        });
    }, close, onChanged);
}
function attachSubmit(form, work, close, onChanged) {
    const submit = el('button', 'btn primary full-width', ['Salvar movimentação']);
    submit.type = 'submit';
    form.append(submit);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        submit.disabled = true;
        void work().then(() => { close(); showToast('Movimentação registrada.', 'success'); onChanged(); })
            .catch((error) => { submit.disabled = false; showToast(error instanceof Error ? error.message : 'Não foi possível salvar.', 'error'); });
    });
}
