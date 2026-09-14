import { getFinancialPosition } from '../../application/planning/get-financial-position.js';
import { formatBRL, sumCents } from '../../domain/money/money.js';
import { el } from '../dom.js';
import { renderAllocationsSection, renderAssetsSection, renderCardsSection, renderDebtsSection, renderRecurrencesSection } from './planning/sections.js';
export async function renderPlanning(repositories, profile, lifecycle, onChanged, onOpenInvestments) {
    const position = await getFinancialPosition(repositories, profile.id);
    const context = { repositories, profile, lifecycle, onChanged };
    const root = el('div', 'screen planning-screen', [
        el('div', 'screen-heading', [el('div', '', [el('h1', '', ['Planejar']), el('p', '', ['Fatos, previsões e patrimônio sem dupla contagem.'])])])
    ]);
    root.append(el('section', 'planning-card', [
        el('small', 'eyebrow', ['LIVRE PARA DECIDIR']),
        el('strong', `planning-value ${position.freeToDecide < 0 ? 'negative-text' : ''}`, [formatBRL(position.freeToDecide)]),
        el('div', 'planning-breakdown', [
            summaryLine('Disponível agora', formatBRL(position.availableNow)),
            summaryLine('Compromissos previstos', `− ${formatBRL(position.commitments.plannedExpense)}`),
            summaryLine('Alocações', `− ${formatBRL(position.totalAllocated)}`)
        ])
    ]));
    root.append(el('section', 'planning-grid', [
        miniMetric('PATRIMÔNIO LÍQUIDO', formatBRL(position.netWorth.netWorth), 'Ativos − passivos'),
        miniMetric('PASSIVOS', formatBRL(position.netWorth.liabilities), 'Dívidas + faturas'),
        miniMetric('ATIVOS', formatBRL(position.netWorth.assets), 'Caixa + investimentos'),
        miniMetric('ATRASADO', formatBRL(position.commitments.overdueExpense), 'Compromissos vencidos')
    ]));
    const investmentHub = el('section', 'section-block investment-hub-card', [
        el('div', 'section-title-row', [el('div', '', [el('h2', '', ['Investimentos']), el('p', 'section-support', ['Carteira, cotações e Radar em um módulo separado do planejamento mensal.'])])]),
        el('div', 'investment-hub-summary', [
            miniMetric('POSIÇÕES', String(position.investments.filter((item) => item.position.quantity > 0).length), 'Ativos com posição'),
            miniMetric('VALOR', formatBRL(sumCents(position.investments.map((item) => item.currentValue))), 'Mercado ou último custo conhecido')
        ])
    ]);
    const openInvestments = el('button', 'btn secondary full-width', ['Abrir Investimentos e Radar']);
    openInvestments.type = 'button';
    openInvestments.addEventListener('click', onOpenInvestments);
    investmentHub.append(openInvestments);
    root.append(renderRecurrencesSection(context, position), renderAllocationsSection(context, position), renderCardsSection(context, position), renderDebtsSection(context, position), investmentHub, renderAssetsSection(context, position));
    return root;
}
function summaryLine(label, value) {
    return el('div', 'planning-line', [el('span', '', [label]), el('strong', '', [value])]);
}
function miniMetric(label, value, note) {
    return el('article', 'mini-card', [el('small', '', [label]), el('strong', '', [value]), el('span', '', [note])]);
}
