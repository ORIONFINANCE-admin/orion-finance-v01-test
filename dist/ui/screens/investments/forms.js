import { createInvestmentInstrument } from '../../../application/investments/create-instrument.js';
import { recordInvestmentTrade } from '../../../application/investments/record-trade.js';
import { saveManualQuote } from '../../../application/investments/manual-quote.js';
import { saveManualFundamentals } from '../../../application/investments/manual-fundamentals.js';
import { el } from '../../dom.js';
import { labeledField, moneyField, selectorField, textField } from '../../components/fields.js';
import { showToast } from '../../components/feedback.js';
import { showSheet } from '../../components/sheets.js';
const ASSET_CLASSES = [
    { value: 'stock', label: 'Ação', description: 'Empresa listada em bolsa' },
    { value: 'reit', label: 'FII', description: 'Fundo imobiliário' },
    { value: 'etf', label: 'ETF', description: 'Fundo de índice' },
    { value: 'bdr', label: 'BDR', description: 'Recibo de ativo estrangeiro' },
    { value: 'fixed-income', label: 'Renda fixa', description: 'Título/CDB/ativo de renda fixa' },
    { value: 'fund', label: 'Fundo', description: 'Fundo de investimento' },
    { value: 'crypto', label: 'Criptoativo', description: 'Ativo digital' },
    { value: 'other', label: 'Outro', description: 'Outra classe de investimento' }
];
function todayISO() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function quantityField() {
    const input = textField('Quantidade');
    input.inputMode = 'decimal';
    input.placeholder = '0';
    return input;
}
export function openCreateInstrumentSheet(repositories, profile, onChanged) {
    const assetClass = selectorField('Classe', ASSET_CLASSES, 'stock');
    const symbol = textField('Código');
    symbol.placeholder = 'Ex.: WEGE3';
    symbol.autocapitalize = 'characters';
    const name = textField('Nome');
    name.placeholder = 'Ex.: WEG';
    const providerSymbol = textField('Código no provedor');
    providerSymbol.placeholder = 'Opcional';
    providerSymbol.autocapitalize = 'characters';
    const form = el('form', 'form-stack', [assetClass.element, labeledField('Código / ticker', symbol), labeledField('Nome', name), labeledField('Código alternativo no provedor', providerSymbol)]);
    const save = el('button', 'btn primary full-width', ['Adicionar ao Radar']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet('Novo investimento', form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = assetClass.getValue();
        if (!selected)
            return;
        save.disabled = true;
        void createInvestmentInstrument(repositories.investmentInstruments, {
            profileId: profile.id,
            symbol: symbol.value,
            name: name.value,
            assetClass: selected,
            venue: 'B3',
            currency: 'BRL',
            ...(providerSymbol.value.trim() ? { providerSymbol: providerSymbol.value } : {})
        }).then(() => {
            close();
            showToast('Ativo adicionado ao Radar.', 'success');
            onChanged();
        }).catch((error) => {
            save.disabled = false;
            showToast(error instanceof Error ? error.message : 'Falha ao cadastrar ativo.', 'error');
        });
    });
}
export async function openTradeSheet(repositories, profile, instrument, onChanged) {
    const accounts = (await repositories.accounts.listByProfile(profile.id)).filter((item) => item.active);
    if (accounts.length === 0) {
        showToast('Cadastre uma conta para liquidar investimentos.', 'error');
        return;
    }
    const account = selectorField('Conta de liquidação', accounts.map((item) => ({ value: item.id, label: item.name })), accounts[0].id);
    const side = selectorField('Operação', [
        { value: 'buy', label: 'Compra', description: 'Reduz caixa e aumenta posição; não é despesa.' },
        { value: 'sell', label: 'Venda', description: 'Aumenta caixa e reduz posição; não é receita operacional.' }
    ], 'buy');
    const quantity = quantityField();
    const gross = moneyField('Valor bruto');
    const fees = moneyField('Taxas');
    fees.value = '0,00';
    const date = textField('Data', todayISO(), 'date');
    const note = textField('Observação');
    const form = el('form', 'form-stack', [side.element, account.element, labeledField('Quantidade', quantity), labeledField('Valor bruto', gross), labeledField('Taxas', fees), labeledField('Data', date), labeledField('Observação', note)]);
    const save = el('button', 'btn primary full-width', ['Registrar operação']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet(`${instrument.symbol} · Negociar`, form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const selectedSide = side.getValue();
        const accountId = account.getValue();
        if (!selectedSide || !accountId)
            return;
        save.disabled = true;
        void recordInvestmentTrade(repositories.investmentTrades, repositories.investmentInstruments, repositories.accounts, repositories.transactions, {
            profileId: profile.id,
            instrumentId: instrument.id,
            settlementAccountId: accountId,
            side: selectedSide,
            quantity: quantity.value,
            grossAmount: gross.value,
            fees: fees.value,
            date: date.value,
            ...(note.value.trim() ? { note: note.value.trim() } : {})
        }).then(() => {
            close();
            showToast('Operação registrada.', 'success');
            onChanged();
        }).catch((error) => {
            save.disabled = false;
            showToast(error instanceof Error ? error.message : 'Falha ao registrar operação.', 'error');
        });
    });
}
export function openManualQuoteSheet(cache, instrument, onChanged) {
    const price = moneyField('Cotação');
    const note = el('div', 'inline-warning', ['Cotação manual atualiza apenas a valorização patrimonial. Não cria receita, compra ou venda.']);
    const form = el('form', 'form-stack', [note, labeledField('Preço atual por unidade', price)]);
    const save = el('button', 'btn primary full-width', ['Salvar cotação']);
    save.type = 'submit';
    form.append(save);
    const close = showSheet(`${instrument.symbol} · Cotação manual`, form);
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        save.disabled = true;
        void saveManualQuote(cache, instrument, price.value).then(() => {
            close();
            showToast('Cotação manual atualizada.', 'success');
            onChanged();
        }).catch((error) => {
            save.disabled = false;
            showToast(error instanceof Error ? error.message : 'Falha ao salvar cotação.', 'error');
        });
    });
}
export function openManualFundamentalsSheet(cache, instrument, onChanged) {
    const reference = textField('Período', `TTM:${todayISO()}`);
    const pe = textField('P/L');
    pe.inputMode = 'decimal';
    const pb = textField('P/VP');
    pb.inputMode = 'decimal';
    const evEbitda = textField('EV/EBITDA');
    evEbitda.inputMode = 'decimal';
    const roe = textField('ROE (%)');
    roe.inputMode = 'decimal';
    const roic = textField('ROIC (%)');
    roic.inputMode = 'decimal';
    const margin = textField('Margem líquida (%)');
    margin.inputMode = 'decimal';
    const debt = textField('Dívida / patrimônio');
    debt.inputMode = 'decimal';
    const currentRatio = textField('Liquidez corrente');
    currentRatio.inputMode = 'decimal';
    const content = el('form', 'form-stack', [
        el('div', 'inline-warning', ['Use entrada manual apenas como fallback. Informe o período do relatório para o Orion não misturar indicadores de épocas diferentes.']),
        labeledField('Período de referência', reference),
        el('div', 'form-grid two', [
            labeledField('P/L', pe), labeledField('P/VP', pb), labeledField('EV/EBITDA', evEbitda),
            labeledField('ROE (%)', roe), labeledField('ROIC (%)', roic), labeledField('Margem líquida (%)', margin),
            labeledField('Dívida / PL', debt), labeledField('Liquidez corrente', currentRatio)
        ])
    ]);
    const save = el('button', 'btn primary full-width', ['Salvar fundamentos']);
    save.type = 'submit';
    content.append(save);
    const close = showSheet(`${instrument.symbol} · Fundamentos manuais`, content);
    content.addEventListener('submit', (event) => {
        event.preventDefault();
        save.disabled = true;
        void saveManualFundamentals(cache, instrument, {
            referencePeriod: reference.value,
            values: {
                pe_ratio: pe.value,
                pb_ratio: pb.value,
                ev_ebitda: evEbitda.value,
                roe_pct: roe.value,
                roic_pct: roic.value,
                net_margin_pct: margin.value,
                debt_to_equity_ratio: debt.value,
                current_ratio: currentRatio.value
            }
        }).then(() => {
            close();
            showToast('Fundamentos manuais atualizados.', 'success');
            onChanged();
        }).catch((error) => {
            save.disabled = false;
            showToast(error instanceof Error ? error.message : 'Falha ao salvar fundamentos.', 'error');
        });
    });
}
