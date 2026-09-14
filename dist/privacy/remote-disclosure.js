export const MARKET_DATA_DISCLOSURE = {
    service: 'Orion Market Gateway',
    purpose: 'Consultar cotação e fundamentos de um instrumento escolhido pelo usuário.',
    fieldsSent: ['symbol', 'venue', 'currency'],
    fieldsNeverSent: ['profileId', 'displayName', 'saldo', 'quantidade', 'preço médio', 'movimentações', 'dívidas']
};
export const DEFAULT_PRIVACY_SUMMARY = {
    storage: 'Dados financeiros permanecem no armazenamento local do aparelho nesta fase.',
    telemetry: 'O Orion não possui analytics ou telemetria de comportamento nesta fase.',
    marketData: 'Ao atualizar mercado, apenas símbolo, bolsa e moeda do instrumento são enviados ao gateway.',
    ai: 'Documentos financeiros não são enviados a IA sem ação e consentimento explícitos do usuário.'
};
