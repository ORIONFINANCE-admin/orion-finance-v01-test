import { getFinancialPosition } from '../../application/planning/get-financial-position.js';
import { formatBRL, sumCents, ZERO_CENTS } from '../../domain/money/money.js';
import { el } from '../dom.js';
import { icon } from '../icons.js';
import { renderAllocationsSection, renderAssetsSection, renderCardsSection, renderDebtsSection, renderRecurrencesSection } from './planning/sections.js';
export async function renderPlanning(repositories, profile, lifecycle, onChanged, onOpenInvestments) {
    const position = await getFinancialPosition(repositories, profile.id);
    const context = { repositories, profile, lifecycle, onChanged };
    const root = el('div', 'screen planning-screen', [
        el('div', 'screen-heading', [el('div', '', [
                el('h1', '', ['Planejar']),
                el('p', '', ['Organize o que precisa pagar, o que deve e seus objetivos.'])
            ])])
    ]);
    root.append(el('section', 'planning-card', [
        el('small', 'eyebrow', ['LIVRE PARA DECIDIR']),
        el('strong', `planning-value ${position.freeToDecide < 0 ? 'negative-text' : ''}`, [formatBRL(position.freeToDecide)]),
        el('p', '', ['O que sobra do saldo disponível depois dos compromissos e valores que você separou para metas.']),
        el('div', 'planning-breakdown', [
            summaryLine('Saldo disponível', formatBRL(position.availableNow)),
            summaryLine('Contas e compromissos', `− ${formatBRL(position.commitments.plannedExpense)}`),
            summaryLine('Metas e reservas', `− ${formatBRL(position.totalAllocated)}`)
        ])
    ]));
    if (position.commitments.overdueExpense > ZERO_CENTS) {
        root.append(el('section', 'planning-alert', [
            el('strong', '', ['Há compromissos atrasados']),
            el('span', '', [`${formatBRL(position.commitments.overdueExpense)} ainda precisa ser resolvido.`])
        ]));
    }
    root.append(renderRecurrencesSection(context, position), renderDebtsSection(context, position), renderAllocationsSection(context, position));
    const investmentHub = el('section', 'section-block investment-hub-card', [
        el('div', 'section-title-row', [el('div', '', [
                el('h2', '', ['Investimentos']),
                el('p', 'section-support', ['Carteira, cotações e Radar ficam disponíveis quando você quiser aprofundar.'])
            ])]),
        el('div', 'investment-hub-summary', [
            miniMetric('POSIÇÕES', String(position.investments.filter((item) => item.position.quantity > 0).length), 'Investimentos com saldo'),
            miniMetric('VALOR', formatBRL(sumCents(position.investments.map((item) => item.currentValue))), 'Valor atual conhecido')
        ])
    ]);
    const openInvestments = el('button', 'btn secondary full-width', ['Abrir Investimentos e Radar']);
    openInvestments.type = 'button';
    openInvestments.addEventListener('click', onOpenInvestments);
    investmentHub.append(openInvestments);
    const moreResources = el('details', 'planning-advanced', [
        el('summary', 'planning-advanced-summary', [
            el('span', 'planning-advanced-copy', [
                el('strong', '', ['Mais recursos']),
                el('small', '', ['Patrimônio, cartões, investimentos e controles mais detalhados.'])
            ]),
            el('span', 'planning-advanced-chevron', [icon('chevron', 'planning-advanced-chevron-icon')])
        ]),
        el('div', 'planning-advanced-content', [
            el('section', 'planning-grid', [
                miniMetric('PATRIMÔNIO', formatBRL(position.netWorth.netWorth), 'Tudo o que você tem menos o que deve'),
                miniMetric('DÍVIDAS E FATURAS', formatBRL(position.netWorth.liabilities), 'Obrigações registradas'),
                miniMetric('DINHEIRO E INVESTIMENTOS', formatBRL(position.netWorth.assets), 'Valores que formam seu patrimônio')
            ]),
            renderCardsSection(context, position),
            investmentHub,
            renderAssetsSection(context, position)
        ])
    ]);
    root.append(moreResources);
    return root;
}
function summaryLine(label, value) {
    return el('div', 'planning-line', [el('span', '', [label]), el('strong', '', [value])]);
}
function miniMetric(label, value, note) {
    return el('article', 'mini-card', [el('small', '', [label]), el('strong', '', [value]), el('span', '', [note])]);
}
