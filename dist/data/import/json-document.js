const ZIP_LOCAL_HEADER = 0x04034b50;
const ZIP_CENTRAL_HEADER = 0x02014b50;
const ZIP_EOCD = 0x06054b50;
const MAX_ARCHIVE_BYTES = 12 * 1024 * 1024;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 64;
function readU16(view, offset) { return view.getUint16(offset, true); }
function readU32(view, offset) { return view.getUint32(offset, true); }
function findEocd(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const floor = Math.max(0, bytes.byteLength - 65_557);
    for (let offset = bytes.byteLength - 22; offset >= floor; offset -= 1) {
        if (readU32(view, offset) === ZIP_EOCD)
            return offset;
    }
    throw new TypeError('Arquivo ZIP sem diretório central válido.');
}
function listZipEntries(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = findEocd(bytes);
    const total = readU16(view, eocd + 10);
    const centralOffset = readU32(view, eocd + 16);
    if (total > MAX_ENTRIES)
        throw new RangeError('Backup ZIP contém arquivos demais.');
    const decoder = new TextDecoder('utf-8');
    const entries = [];
    let cursor = centralOffset;
    for (let index = 0; index < total; index += 1) {
        if (readU32(view, cursor) !== ZIP_CENTRAL_HEADER)
            throw new TypeError('Diretório central ZIP inválido.');
        const flags = readU16(view, cursor + 8);
        const method = readU16(view, cursor + 10);
        const compressedSize = readU32(view, cursor + 20);
        const uncompressedSize = readU32(view, cursor + 24);
        const nameLength = readU16(view, cursor + 28);
        const extraLength = readU16(view, cursor + 30);
        const commentLength = readU16(view, cursor + 32);
        const localOffset = readU32(view, cursor + 42);
        const nameBytes = bytes.slice(cursor + 46, cursor + 46 + nameLength);
        entries.push({ name: decoder.decode(nameBytes), method, flags, compressedSize, uncompressedSize, localOffset });
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}
async function inflateEntry(bytes, entry) {
    if ((entry.flags & 0x1) !== 0)
        throw new TypeError('Backups ZIP criptografados não são suportados.');
    if (entry.uncompressedSize > MAX_JSON_BYTES)
        throw new RangeError('JSON do backup excede o limite seguro.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (readU32(view, entry.localOffset) !== ZIP_LOCAL_HEADER)
        throw new TypeError('Entrada ZIP inválida.');
    const nameLength = readU16(view, entry.localOffset + 26);
    const extraLength = readU16(view, entry.localOffset + 28);
    const dataOffset = entry.localOffset + 30 + nameLength + extraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + entry.compressedSize);
    if (entry.method === 0)
        return compressed;
    if (entry.method !== 8)
        throw new TypeError(`Método ZIP não suportado (${entry.method}).`);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const inflated = new Uint8Array(await new Response(stream).arrayBuffer());
    if (inflated.byteLength !== entry.uncompressedSize)
        throw new TypeError('Tamanho do backup ZIP não confere.');
    return inflated;
}
async function extractJsonFromZip(bytes) {
    const entries = listZipEntries(bytes).filter((entry) => entry.name.toLowerCase().endsWith('.json') && !entry.name.startsWith('__MACOSX/') && !entry.name.endsWith('/'));
    if (entries.length !== 1)
        throw new TypeError('O backup ZIP deve conter exatamente um arquivo JSON principal.');
    const inflated = await inflateEntry(bytes, entries[0]);
    return new TextDecoder('utf-8', { fatal: true }).decode(inflated);
}
export async function readJsonDocument(file) {
    if (file.size > MAX_ARCHIVE_BYTES)
        throw new RangeError('Arquivo de backup excede o limite seguro de 12 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength >= 4 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true) === ZIP_LOCAL_HEADER) {
        return extractJsonFromZip(bytes);
    }
    if (bytes.byteLength > MAX_JSON_BYTES)
        throw new RangeError('JSON do backup excede o limite seguro de 8 MB.');
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
