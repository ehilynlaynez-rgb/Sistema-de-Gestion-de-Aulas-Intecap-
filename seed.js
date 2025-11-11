
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sqlite3.verbose();
const dbPath = path.join(__dirname, 'db.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
const db = new sqlite3.Database(dbPath);

function run(sql, params=[]) {
  return new Promise((resolve,reject)=>{
    db.run(sql, params, function(err){ if (err) reject(err); else resolve(this); });
  });
}
const all = (sql, params=[]) => new Promise((res,rej)=>db.all(sql,params,(e,r)=>e?rej(e):res(r)));

(async()=>{
  await run(`PRAGMA foreign_keys = ON;`);
  await run(`CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, correo TEXT UNIQUE, contrasena TEXT, rol TEXT)`);
  await run(`CREATE TABLE aulas (id INTEGER PRIMARY KEY, nombre TEXT, modulo TEXT, estado TEXT, ocupado_por TEXT)`);
  await run(`CREATE TABLE recursos (id INTEGER PRIMARY KEY AUTOINCREMENT, aula_id INTEGER, tipo TEXT, codigo TEXT, estado TEXT, FOREIGN KEY(aula_id) REFERENCES aulas(id))`);
  await run(`CREATE TABLE reservas (id INTEGER PRIMARY KEY AUTOINCREMENT, aula_id INTEGER, usuario_id INTEGER, fecha_inicio TEXT, fecha_fin TEXT, estado TEXT)`);
  await run(`CREATE TABLE danios (id INTEGER PRIMARY KEY AUTOINCREMENT, recurso_id INTEGER, descripcion TEXT, foto TEXT, estado TEXT, fecha TEXT)`);

  const dataDir = path.join(__dirname, 'data');
  const readCsv = (name) => {
    const p = path.join(dataDir, name);
    if (!fs.existsSync(p)) return null;
    const text = fs.readFileSync(p, 'utf8');
    try { return parse(text, { columns: true, skip_empty_lines: true }); }
    catch { return parse(text, { columns: true, skip_empty_lines: true, delimiter: ';' }); }
  };

  const usuarios = readCsv('Usuarios.csv') || [];
  for (const u of usuarios) {
    let rol = (u.Rol||'').toLowerCase().trim();
    if (rol === 'profesor') rol = 'instructor';
    if (!['admin','tecnico','instructor'].includes(rol)) rol = 'instructor';
    const hash = await bcrypt.hash((u.Contrasena||'changeme').toString(),10);
    await run(`INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?,?,?,?)`, [u.Nombre, u.Correo, hash, rol]);
  }

  const aulas = readCsv('Aulas.csv') || [];
  for (const a of aulas) {
    await run(`INSERT INTO aulas (id,nombre,modulo,estado,ocupado_por) VALUES (?,?,?,?,?)`,
      [parseInt(a.Id), a.Nombre, a.Modulo, a.Estado||'Libre', a.Ocupado_por||null]);
  }

  const recursos = readCsv('Recursos.csv') || [];
  for (const r of recursos) {
    await run(`INSERT INTO recursos (aula_id,tipo,codigo,estado) VALUES (?,?,?,?)`,
      [parseInt(r.Aula_id), r.Tipo, r.Codigo, r.Estado||'Activo']);
  }

  console.log('Seed OK. db.sqlite listo.');
  db.close();
})();
