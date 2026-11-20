// Un escritor de .zip mínimo, sin dependencias: Node trae `zlib` (compresión y CRC-32) pero no sabe armar el contenedor.
// Sirve para el .zip de las descargas y para los .docx, que son zips. Nombres de archivo en UTF-8.
import { crc32, deflateRawSync } from 'node:zlib';

/** @param {{ nombre: string, datos: Buffer }[]} entradas  @returns {Buffer} */
export function crearZip(entradas) {
    const ahora = new Date();
    const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
    const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

    const partes = [];
    const central = [];
    let desplazamiento = 0;
    for (const { nombre, datos } of entradas) {
        const nom = Buffer.from(nombre, 'utf8');
        const crc = crc32(datos) >>> 0;
        const comprimido = deflateRawSync(datos);
        const comprime = comprimido.length < datos.length;
        const cuerpo = comprime ? comprimido : datos;
        const metodo = comprime ? 8 : 0;

        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4); // versión necesaria
        local.writeUInt16LE(0x0800, 6); // nombre en UTF-8
        local.writeUInt16LE(metodo, 8);
        local.writeUInt16LE(hora, 10);
        local.writeUInt16LE(fecha, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(cuerpo.length, 18);
        local.writeUInt32LE(datos.length, 22);
        local.writeUInt16LE(nom.length, 26);
        partes.push(local, nom, cuerpo);

        const reg = Buffer.alloc(46);
        reg.writeUInt32LE(0x02014b50, 0);
        reg.writeUInt16LE(20, 4); // versión con que se hizo
        reg.writeUInt16LE(20, 6); // versión necesaria
        reg.writeUInt16LE(0x0800, 8);
        reg.writeUInt16LE(metodo, 10);
        reg.writeUInt16LE(hora, 12);
        reg.writeUInt16LE(fecha, 14);
        reg.writeUInt32LE(crc, 16);
        reg.writeUInt32LE(cuerpo.length, 20);
        reg.writeUInt32LE(datos.length, 24);
        reg.writeUInt16LE(nom.length, 28);
        reg.writeUInt32LE(desplazamiento, 42);
        central.push(reg, nom);

        desplazamiento += local.length + nom.length + cuerpo.length;
    }
    const directorio = Buffer.concat(central);
    const fin = Buffer.alloc(22);
    fin.writeUInt32LE(0x06054b50, 0);
    fin.writeUInt16LE(entradas.length, 8);
    fin.writeUInt16LE(entradas.length, 10);
    fin.writeUInt32LE(directorio.length, 12);
    fin.writeUInt32LE(desplazamiento, 16);
    return Buffer.concat([...partes, directorio, fin]);
}
