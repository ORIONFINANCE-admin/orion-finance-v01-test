import { addCents, ZERO_CENTS } from '../../domain/money/money.js';
import { asArray, asRecord, booleanValue, createdAt, legacyMoney, optionalString, stringValue, updatedAt } from './shared.js';
function institutionId(record) {
    const raw = `${stringValue(record, 'brand')} ${stringValue(record, 'institution')} ${stringValue(record, 'name')}`.toLowerCase();
    if (raw.includes('bradesco'))
        return 'bradesco';
    if (raw.includes('mercado') || raw.includes('mercado_pago'))
        return 'mercado-pago';
    if (raw.includes('inter'))
        return 'inter';
    if (raw.includes('caju'))
        return 'caju';
    if (raw.includes('nubank'))
        return 'nubank';
    if (raw.includes('itau') || raw.includes('itaú'))
        return 'itau';
    if (raw.includes('santander'))
        return 'santander';
    if (raw.includes('caixa'))
        return 'caixa';
    return 'custom';
}
function accountType(record, institution) {
    const raw = stringValue(record, 'type').toLowerCase();
    if (raw.includes('benef'))
        return 'benefit';
    if (raw.includes('poup'))
        return 'savings';
    if (raw.includes('dinheiro') || raw.includes('cash'))
        return 'cash';
    if (institution === 'mercado-pago' || institution === 'picpay')
        return 'payment';
    if (raw.includes('corrente') || raw.includes('digital'))
        return 'checking';
    return 'other';
}
export function convertLegacyCore(data, targetProfileId, exportedAt) {
    const profiles = asArray(data, 'profiles').map((item) => asRecord(item, 'Perfil legado'));
    const sourceProfile = profiles[0];
    const displayName = sourceProfile ? stringValue(sourceProfile, 'name', 'Usuário').trim() || 'Usuário' : 'Usuário';
    const profile = {
        id: targetProfileId,
        displayName,
        locale: 'pt-BR',
        baseCurrency: 'BRL',
        onboardingCompletedAt: exportedAt,
        createdAt: sourceProfile ? createdAt(sourceProfile, exportedAt) : exportedAt,
        updatedAt: exportedAt
    };
    const contexts = new Map();
    for (const item of asArray(data, 'accounts')) {
        const legacy = asRecord(item, 'Conta legada');
        const id = stringValue(legacy, 'id');
        if (!id)
            throw new TypeError('Conta legada sem id.');
        const institution = institutionId(legacy);
        const color = optionalString(legacy, 'color');
        const account = {
            id,
            profileId: targetProfileId,
            name: stringValue(legacy, 'name', 'Conta').trim() || 'Conta',
            openingBalance: legacyMoney(legacy, 'initial_balance'),
            active: legacy.active !== false,
            institutionId: institution,
            type: accountType(legacy, institution),
            ...(color ? { color } : {}),
            includeInAvailable: true,
            createdAt: createdAt(legacy, exportedAt),
            updatedAt: updatedAt(legacy, exportedAt)
        };
        const creditEnabled = booleanValue(legacy, 'credit_card_enabled');
        const currentGuarantee = legacyMoney(legacy, 'cdb_mais_limite');
        contexts.set(id, {
            legacy,
            account,
            ...(creditEnabled ? { cardId: `card_legacy_${id}` } : {}),
            ...(currentGuarantee > ZERO_CENTS ? { guaranteeAssetId: `asset_legacy_guarantee_${id}` } : {}),
            currentGuarantee
        });
    }
    return { profile, accounts: [...contexts.values()].map((item) => item.account), accountContexts: contexts };
}
export function finalizeCardsAndGuarantees(contexts, targetProfileId, guaranteePayments, exportedAt) {
    const creditCards = [];
    const assets = [];
    for (const context of contexts.values()) {
        let guaranteeAssetId = context.guaranteeAssetId;
        const syntheticPaid = context.cardId ? (guaranteePayments.get(context.cardId) ?? ZERO_CENTS) : ZERO_CENTS;
        if (syntheticPaid > ZERO_CENTS && !guaranteeAssetId)
            guaranteeAssetId = `asset_legacy_guarantee_${context.account.id}`;
        if (guaranteeAssetId) {
            assets.push({
                id: guaranteeAssetId,
                profileId: targetProfileId,
                name: `${context.account.name} · Garantia`,
                ...(context.account.institutionId ? { institutionId: context.account.institutionId } : {}),
                kind: 'guarantee',
                openingValue: addCents(context.currentGuarantee, syntheticPaid),
                liquidity: 'restricted',
                active: true,
                includeInNetWorth: true,
                policyId: context.account.institutionId === 'inter' ? 'inter-cdb-mais-limite' : 'legacy-guarantee',
                createdAt: context.account.createdAt ?? exportedAt,
                updatedAt: exportedAt
            });
        }
        if (context.cardId) {
            creditCards.push({
                id: context.cardId,
                profileId: targetProfileId,
                name: `${context.account.name} · Crédito`,
                ...(context.account.institutionId ? { institutionId: context.account.institutionId } : {}),
                paymentAccountId: context.account.id,
                ...(guaranteeAssetId ? { guaranteeAssetId } : {}),
                openingLiability: ZERO_CENTS,
                active: true,
                createdAt: context.account.createdAt ?? exportedAt,
                updatedAt: exportedAt
            });
        }
    }
    return { creditCards, assets };
}
