function readCssValue(documentRef, name) {
    if (typeof getComputedStyle !== 'function')
        return 'unavailable';
    return getComputedStyle(documentRef.documentElement).getPropertyValue(name).trim() || '0px';
}
export function collectDeviceDiagnostics(environment = {
    navigatorRef: navigator,
    windowRef: window,
    screenRef: screen,
    documentRef: document
}) {
    const standalone = environment.windowRef.matchMedia('(display-mode: standalone)').matches
        || environment.navigatorRef.standalone === true;
    const visual = environment.windowRef.visualViewport ?? null;
    const serviceWorkerSupported = 'serviceWorker' in environment.navigatorRef;
    return {
        platform: standalone ? 'web-pwa' : 'web-browser',
        standalone,
        online: environment.navigatorRef.onLine !== false,
        locale: environment.navigatorRef.language || 'unknown',
        viewport: {
            width: environment.windowRef.innerWidth,
            height: environment.windowRef.innerHeight,
            visualWidth: visual?.width ?? null,
            visualHeight: visual?.height ?? null,
            visualOffsetTop: visual?.offsetTop ?? null,
            visualOffsetLeft: visual?.offsetLeft ?? null,
            scale: visual?.scale ?? null
        },
        screen: {
            width: environment.screenRef.width,
            height: environment.screenRef.height,
            pixelRatio: environment.windowRef.devicePixelRatio
        },
        safeArea: {
            top: readCssValue(environment.documentRef, '--safe-top'),
            right: readCssValue(environment.documentRef, '--safe-right'),
            bottom: readCssValue(environment.documentRef, '--safe-bottom'),
            left: readCssValue(environment.documentRef, '--safe-left')
        },
        serviceWorker: {
            supported: serviceWorkerSupported,
            controlled: serviceWorkerSupported && Boolean(environment.navigatorRef.serviceWorker?.controller)
        },
        userAgent: environment.navigatorRef.userAgent
    };
}
