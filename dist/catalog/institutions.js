const CATALOG = [
    { id: 'bradesco', name: 'Bradesco', shortName: 'B', color: '#cc163f', kind: 'bank' },
    { id: 'inter', name: 'Inter', shortName: 'IN', color: '#ff7a00', kind: 'bank' },
    { id: 'mercado-pago', name: 'Mercado Pago', shortName: 'MP', color: '#00a9e8', kind: 'wallet' },
    { id: 'caju', name: 'Caju', shortName: 'CJ', color: '#ff5c3e', kind: 'benefit' },
    { id: 'nubank', name: 'Nubank', shortName: 'NU', color: '#820ad1', kind: 'bank' },
    { id: 'itau', name: 'Itaú', shortName: 'IT', color: '#ec7000', kind: 'bank' },
    { id: 'santander', name: 'Santander', shortName: 'ST', color: '#ec0000', kind: 'bank' },
    { id: 'banco-do-brasil', name: 'Banco do Brasil', shortName: 'BB', color: '#f8d117', kind: 'bank' },
    { id: 'caixa', name: 'Caixa', shortName: 'CX', color: '#0b74b8', kind: 'bank' },
    { id: 'picpay', name: 'PicPay', shortName: 'PP', color: '#21c25e', kind: 'wallet' },
    { id: 'pagbank', name: 'PagBank', shortName: 'PB', color: '#00a868', kind: 'bank' },
    { id: 'btg', name: 'BTG Pactual', shortName: 'BTG', color: '#0b1d3a', kind: 'bank' },
    { id: 'xp', name: 'XP', shortName: 'XP', color: '#111111', kind: 'broker' },
    { id: 'rico', name: 'Rico', shortName: 'RI', color: '#ff6a13', kind: 'broker' },
    { id: 'sicredi', name: 'Sicredi', shortName: 'SC', color: '#4b9f2d', kind: 'cooperative' },
    { id: 'sicoob', name: 'Sicoob', shortName: 'SB', color: '#0a7f65', kind: 'cooperative' },
    { id: 'neon', name: 'Neon', shortName: 'NE', color: '#00e1ff', kind: 'bank' },
    { id: 'next', name: 'Next', shortName: 'NX', color: '#00c875', kind: 'bank' },
    { id: 'will-bank', name: 'Will Bank', shortName: 'WB', color: '#ffd500', kind: 'bank' },
    { id: 'custom', name: 'Outra instituição', shortName: '+', color: '#58708f', kind: 'other' }
];
export function listInstitutions() {
    return CATALOG;
}
export function getInstitution(id) {
    if (!id)
        return null;
    return CATALOG.find((item) => item.id === id) ?? null;
}
