import { el } from './dom.js';
const PATHS = {
    home: ['M3 10.8 12 3l9 7.8', 'M5.5 9.7V21h13V9.7', 'M9.5 21v-6h5v6'],
    movement: ['M5 7h14', 'm15 4-4-4 4-4', 'M19 17H5', 'm9 4 4-4-4-4'],
    plan: ['M4 5h16v15H4z', 'M8 3v4', 'M16 3v4', 'M4 10h16', 'M8 14h3', 'M8 17h6'],
    accounts: ['M4 7h16v12H4z', 'M7 7V5h10v2', 'M8 12h8', 'M8 16h5'],
    plus: ['M12 5v14', 'M5 12h14'],
    chevron: ['m9 6 6 6-6 6'],
    wallet: ['M4 7h16v12H4z', 'M4 10h16', 'M15 14h3'],
    close: ['M6 6l12 12', 'M18 6 6 18'],
    check: ['m5 12 4 4L19 6']
};
export function icon(name, className = 'icon') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add(className);
    for (const d of PATHS[name]) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        svg.append(path);
    }
    return svg;
}
export function iconButton(name, label, onClick) {
    const node = el('button', 'icon-button', [icon(name)]);
    node.type = 'button';
    node.setAttribute('aria-label', label);
    node.addEventListener('click', onClick);
    return node;
}
