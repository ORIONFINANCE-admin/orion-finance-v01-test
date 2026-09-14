import { el } from '../dom.js';
import { showToast } from './feedback.js';
let statusNode = null;
let previousOnline = null;
function removeStatus() {
    statusNode?.remove();
    statusNode = null;
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
}
export function syncConnectivityStatus(online = navigator.onLine !== false) {
    if (online) {
        removeStatus();
        if (previousOnline === false)
            showToast('Conexão restaurada.', 'success');
    }
    else {
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
