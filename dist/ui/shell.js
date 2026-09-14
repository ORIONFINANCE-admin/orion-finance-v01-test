import { el } from './dom.js';
import { icon } from './icons.js';
function initialFor(name) {
    return name.trim().charAt(0).toUpperCase() || 'O';
}
export function createShell(profile, onNavigate, onCreate) {
    const brand = el('div', 'brand-lockup', [
        el('span', 'brand-symbol', ['✦']),
        el('div', 'brand-copy', [el('small', '', ['ORION FINANCE']), el('span', '', ['MAIS CONTROLE. MAIS LIBERDADE.'])])
    ]);
    const profileButton = el('button', 'profile-chip', [initialFor(profile.displayName)]);
    profileButton.type = 'button';
    profileButton.setAttribute('aria-label', 'Conta e configurações');
    profileButton.addEventListener('click', () => onNavigate('settings'));
    const header = el('header', 'app-header', [brand, profileButton]);
    const content = el('main', 'app-content');
    const dock = el('nav', 'bottom-dock');
    dock.setAttribute('aria-label', 'Navegação principal');
    const routes = [
        { route: 'home', label: 'Início', iconName: 'home' },
        { route: 'movements', label: 'Mov.', iconName: 'movement' },
        { route: 'planning', label: 'Planejar', iconName: 'plan' },
        { route: 'accounts', label: 'Contas', iconName: 'accounts' }
    ];
    const routeButtons = new Map();
    const appendRoute = (item) => {
        const node = el('button', 'dock-item', [icon(item.iconName), el('span', '', [item.label])]);
        node.type = 'button';
        node.dataset.route = item.route;
        node.addEventListener('click', () => onNavigate(item.route));
        routeButtons.set(item.route, node);
        dock.append(node);
    };
    appendRoute(routes[0]);
    appendRoute(routes[1]);
    const fab = el('button', 'dock-fab', [icon('plus')]);
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Nova movimentação');
    fab.addEventListener('click', onCreate);
    dock.append(fab);
    appendRoute(routes[2]);
    appendRoute(routes[3]);
    const shell = el('div', 'app-shell', [header, content, dock]);
    return {
        shell,
        content,
        setActiveRoute(route) {
            for (const [key, value] of routeButtons) {
                const active = key === route;
                value.classList.toggle('active', active);
                if (active)
                    value.setAttribute('aria-current', 'page');
                else
                    value.removeAttribute('aria-current');
            }
            profileButton.classList.toggle('active', route === 'settings');
            if (route === 'settings')
                profileButton.setAttribute('aria-current', 'page');
            else
                profileButton.removeAttribute('aria-current');
        },
        setProfile(next) {
            profileButton.textContent = initialFor(next.displayName);
            profileButton.setAttribute('aria-label', `Conta de ${next.displayName}`);
        }
    };
}
