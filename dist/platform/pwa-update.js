function asError(value) {
    return value instanceof Error ? value : new Error('Falha desconhecida no service worker.');
}
export async function registerPwaUpdateFlow(callbacks, serviceWorkerContainer = navigator.serviceWorker) {
    if (!serviceWorkerContainer)
        return null;
    let reloading = false;
    serviceWorkerContainer.addEventListener('controllerchange', () => {
        if (reloading)
            return;
        reloading = true;
        window.location.reload();
    });
    try {
        const registration = await serviceWorkerContainer.register('./service-worker.js', { scope: './' });
        callbacks.onRegistered?.();
        const announce = (worker) => {
            if (!worker || !serviceWorkerContainer.controller)
                return;
            callbacks.onUpdateReady(() => worker.postMessage({ type: 'SKIP_WAITING' }));
        };
        announce(registration.waiting);
        registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            if (!worker)
                return;
            worker.addEventListener('statechange', () => {
                if (worker.state === 'installed')
                    announce(worker);
            });
        });
        void registration.update().catch(() => undefined);
        return registration;
    }
    catch (error) {
        callbacks.onError?.(asError(error));
        return null;
    }
}
