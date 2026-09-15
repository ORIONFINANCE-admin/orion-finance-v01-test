import { el } from '../dom.js';
import { showToast } from './feedback.js';
const OFFLINE_STATUS_DURATION_MS = 6000;
let statusNode = null;
let statusTimer = null;
let previousOnline = null;
function clearStatusTimer() {
    if (statusTimer === null)
        return;
    window.clearTimeout(statusTimer);
    statusTimer = null;
}
function removeStatus() {
    clearStatusTimer();
    statusNode?.remove();
    statusNode = null;
}
function scheduleStatusRemoval() {
    clearStatusTimer();
    statusTimer = window.setTimeout(() => {
        statusTimer = null;
        statusNode?.remove();
        statusNode = null;
    }, OFFLINE_STATUS_DURATION_MS);
}
function showOfflineStatus() {
    if (statusNode)
        return;
    statusNode = el('div', 'system-status offline-status', [
        el('strong', '', ['Offline']),
        el('span', '', ['Seus dados locais continuam disponíveis. Atualizações externas aguardam conexão.'])
    ]);
    statusNode.setAttribute('role', 'status');
    statusNode.setAttribute('aria-live', 'polite');
    document.body.append(statusNode);
    scheduleStatusRemoval();
}
export function syncConnectivityStatus(online = navigator.onLine !== false) {
    if (online) {
        removeStatus();
        if (previousOnline === false)
            showToast('Conexão restaurada.', 'success');
    }
    else if (previousOnline !== false || statusNode === null) {
        showOfflineStatus();
    }
    previousOnline = online;
}
export function bindConnectivityStatus() {
    const online = () => syncConnectivityStatus(true);
    const offline = () => syncConnectivityStatus(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    syncConnectivityStatus();
    return () => {
        window.removeEventListener('online', online);
        window.removeEventListener('offline', offline);
        removeStatus();
    };
}
