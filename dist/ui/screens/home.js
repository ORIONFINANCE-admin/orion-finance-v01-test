import { getDashboardSnapshot } from '../../application/dashboard/get-dashboard.js';
import { financialStatusLabel } from '../../application/dashboard/financial-status.js';
import { formatBRL } from '../../domain/money/money.js';
import { getInstitution } from '../../catalog/institutions.js';
import { el } from '../dom.js';
function greetingFor(now) {
    const hour = now.getHours();
    if (hour < 12)
        return 'Bom dia';
    if (hour < 18)
        return 'Boa tarde';
    return 'Boa noite';
}
function metric(label, value, tone) {
    return el('div', 'metric-tile', [
        el('span', `metric-dot ${tone}`),
        el('div', 'metric-copy', [el('small', '', [label]), el('strong', '', [value])])
    ]);
}
export async function renderHome(repositories, profile, actions) {
    const snapshot = await getDashboardSnapshot(repositories, profile.id);
    const root = el('div', 'screen home-screen');
    const greeting = el('section', 'greeting-row', [
        el('div', '', [
            el('h1', '', [`${greetingFor(new Date())}, ${profile.displayName}!`]),
            el('p', '', ['Sua visão financeira, sem ruído.'])
        ]),
        el('span', `status-pill status-${snapshot.status}`, [financialStatusLabel(snapshot.status)])
    ]);
    const balance = el('section', 'hero-card', [
        el('div', 'hero-card-top', [el('span', 'eyebrow', ['DISPONÍVEL AGORA'])]),
        el('strong', 'hero-money', [formatBRL(snapshot.availableNow)]),
        el('div', 'metrics-grid', [
            metric('Entrou no mês', formatBRL(snapshot.incomeMonth), 'positive'),
            metric('Saiu no mês', formatBRL(snapshot.expenseMonth), 'negative'),
            metric('Resultado', formatBRL(snapshot.resultMonth), snapshot.resultMonth >= 0 ? 'positive' : 'negative'),
            metric('Livre para decidir*', formatBRL(snapshot.freeToDecide), 'accent')
        ]),
        el('small', 'metric-note', ['*Disponível menos compromissos previstos e alocações ativas.'])
    ]);
    const accountsSection = el('section', 'section-block');
    const openAccounts = el('button', 'text-action', [snapshot.accounts.length ? 'Ver todas' : 'Adicionar']);
    openAccounts.type = 'button';
    openAccounts.addEventListener('click', actions.onOpenAccounts);
    accountsSection.append(el('div', 'section-title-row', [el('h2', '', ['Contas']), openAccounts]));
    if (snapshot.accounts.length === 0) {
        const emptyAction = el('button', 'btn secondary compact', ['Adicionar primeira conta']);
        emptyAction.type = 'button';
        emptyAction.addEventListener('click', actions.onOpenAccounts);
        accountsSection.append(el('div', 'empty-card actionable-empty', [
            el('strong', '', ['Sua base financeira começa pelas contas']),
            el('span', '', ['Cadastre onde seu dinheiro está para o Orion calcular saldos e patrimônio com precisão.']),
            emptyAction
        ]));
    }
    else {
        const list = el('div', 'account-list');
        for (const account of snapshot.accounts.slice(0, 4)) {
            const institution = getInstitution(account.institutionId);
            const balanceValue = snapshot.balances.get(account.id);
            const mark = el('span', 'institution-mark', [institution?.shortName ?? account.name.slice(0, 2).toUpperCase()]);
            if (account.color)
                mark.style.setProperty('--institution-color', account.color);
            list.append(el('article', 'account-row', [
                mark,
                el('div', 'account-copy', [
                    el('strong', '', [account.name]),
                    el('small', '', [institution?.name ?? 'Instituição personalizada'])
                ]),
                el('b', 'account-balance', [balanceValue === undefined ? '—' : formatBRL(balanceValue)])
            ]));
        }
        accountsSection.append(list);
    }
    const priority = el('button', 'priority-card', [
        el('span', 'priority-icon', ['✦']),
        el('div', '', [
            el('small', '', ['PRÓXIMA PRIORIDADE']),
            el('strong', '', [snapshot.plannedExpense > 0 ? 'Cobrir compromissos previstos' : 'Consolidar a base financeira']),
            el('span', '', [snapshot.plannedExpense > 0 ? `${formatBRL(snapshot.plannedExpense)} previstos no mês.` : 'Mantenha contas, registros e patrimônio consistentes.'])
        ]),
        el('span', 'priority-chevron', ['›'])
    ]);
    priority.type = 'button';
    priority.setAttribute('aria-label', 'Abrir planejamento financeiro');
    priority.addEventListener('click', actions.onOpenPlanning);
    root.append(greeting, balance, priority, accountsSection);
    return root;
}
