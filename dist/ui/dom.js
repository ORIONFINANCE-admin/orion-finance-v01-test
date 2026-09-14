export function el(tag, className, children = []) {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    for (const child of children) {
        if (child === null || child === undefined || child === false)
            continue;
        node.append(child instanceof Node ? child : document.createTextNode(child));
    }
    return node;
}
export function clear(node) {
    node.replaceChildren();
}
export function button(className, label, onClick) {
    const node = el('button', className, [label]);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
}
export function setText(node, value) {
    node.textContent = value;
}
