export function deactivateEntity(gateway, profileId, entityType, entityId) {
    if (!entityId.trim())
        throw new TypeError('Identificador do registro é obrigatório.');
    return gateway.deactivate(profileId, entityType, entityId);
}
export function undoEntityMutation(gateway, profileId, auditEventId) {
    if (!auditEventId.trim())
        throw new TypeError('Identificador da alteração é obrigatório.');
    return gateway.undo(profileId, auditEventId);
}
