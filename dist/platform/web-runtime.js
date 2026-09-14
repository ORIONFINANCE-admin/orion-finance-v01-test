function detectKind(environment) {
    const standalone = environment.window.matchMedia('(display-mode: standalone)').matches
        || environment.navigator.standalone === true;
    return standalone ? 'web-pwa' : 'web-browser';
}
export class WebPlatformRuntime {
    environment;
    kind;
    constructor(environment = {
        navigator,
        document,
        window
    }) {
        this.environment = environment;
        this.kind = detectKind(environment);
    }
    isOnline() {
        return this.environment.navigator.onLine !== false;
    }
    isStandalone() {
        return this.kind === 'web-pwa';
    }
    onResume(listener) {
        const handler = () => {
            if (this.environment.document.visibilityState === 'visible')
                listener();
        };
        this.environment.document.addEventListener('visibilitychange', handler);
        return () => this.environment.document.removeEventListener('visibilitychange', handler);
    }
    onOnline(listener) {
        const handler = () => listener();
        this.environment.window.addEventListener('online', handler);
        return () => this.environment.window.removeEventListener('online', handler);
    }
}
