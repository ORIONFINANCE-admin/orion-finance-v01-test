export function financialStatusFor(input) {
    if (input.availableNow < 0 || input.freeToDecide < 0)
        return 'tight';
    if (input.resultMonth < 0)
        return 'attention';
    if (input.freeToDecide === 0 && (input.plannedExpense > 0 || input.allocated > 0))
        return 'attention';
    return 'comfortable';
}
export function financialStatusLabel(status) {
    if (status === 'tight')
        return 'Apertado';
    if (status === 'attention')
        return 'Atenção';
    return 'Confortável';
}
