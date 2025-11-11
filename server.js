
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.ORIGIN || `http://localhost:${PORT}`;

const app = express();
app.use(express.json({limit:'10mb'}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- DB ---
const dbPath = path.join(__dirname, 'db.sqlite');
sqlite3.verbose();
const db = new sqlite3.Database(dbPath);

// Helper to run queries with Promise
function run(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err); else resolve(this);
    });
  });
}
function all(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}
function get(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

// Ensure schema exists
async function ensureSchema() {
  await run(db, `PRAGMA foreign_keys = ON;`);
  await run(db, `CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT UNIQUE NOT NULL,
    contrasena TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin','tecnico','instructor'))
  );`);
  await run(db, `CREATE TABLE IF NOT EXISTS aulas (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    modulo TEXT NOT NULL,
    estado TEXT DEFAULT 'Libre',
    ocupado_por TEXT
  );`);
  await run(db, `CREATE TABLE IF NOT EXISTS recursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aula_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    codigo TEXT NOT NULL,
    estado TEXT DEFAULT 'Activo',
    FOREIGN KEY(aula_id) REFERENCES aulas(id) ON DELETE CASCADE
  );`);
  await run(db, `CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aula_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    fecha_inicio TEXT NOT NULL,
    fecha_fin TEXT NOT NULL,
    estado TEXT DEFAULT 'activa',
    FOREIGN KEY(aula_id) REFERENCES aulas(id),
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
  );`);
  await run(db, `CREATE TABLE IF NOT EXISTS danios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recurso_id INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    foto TEXT,
    estado TEXT DEFAULT 'reportado',
    fecha TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(recurso_id) REFERENCES recursos(id)
  );`);
}

// Seed from CSVs if empty
import fs from 'fs';
import { parse } from 'csv-parse/sync';

async function seedIfEmpty() {
  const anyUser = await get(db, 'SELECT id FROM usuarios LIMIT 1');
  if (anyUser) return; // already seeded

  const dataDir = path.join(__dirname, 'data');
  const readCsv = (name) => {
    const p = path.join(dataDir, name);
    if (!fs.existsSync(p)) return null;
    const text = fs.readFileSync(p, 'utf8');
    try {
      return parse(text, { columns: true, skip_empty_lines: true });
    } catch {
      return parse(text, { columns: true, skip_empty_lines: true, delimiter: ';' });
    }
  };

  const usuarios = readCsv('Usuarios.csv') || [];
  const aulas = readCsv('Aulas.csv') || [];
  const recursos = readCsv('Recursos.csv') || [];
  const danios = readCsv('Danios.csv') || [];
  // Reservas se mantiene vacía si viene vacía

  // Normalize roles: 'profesor' => 'instructor'
  for (const u of usuarios) {
    let rol = (u.Rol || '').toLowerCase().trim();
    if (rol === 'profesor') rol = 'instructor';
    if (!['admin','tecnico','instructor'].includes(rol)) rol = 'instructor';
    const nombre = u.Nombre?.toString().trim() || '';
    const correo = u.Correo?.toString().trim() || '';
    const plain = u.Contrasena?.toString().trim() || 'changeme';
    const hash = await bcrypt.hash(plain, 10);
    await run(db, `INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?,?,?,?)`,
      [nombre, correo, hash, rol]);
  }

  for (const a of aulas) {
    const id = parseInt(a.Id);
    const nombre = a.Nombre?.toString().trim();
    const modulo = a.Modulo?.toString().trim();
    const estado = (a.Estado?.toString().trim()) || 'Libre';
    const ocupado = a.Ocupado_por?.toString().trim() || null;
    await run(db, `INSERT INTO aulas (id, nombre, modulo, estado, ocupado_por) VALUES (?,?,?,?,?)`,
      [id, nombre, modulo, estado, ocupado]);
  }

  for (const r of recursos) {
    const aula_id = parseInt(r.Aula_id);
    const tipo = r.Tipo?.toString().trim();
    const codigo = r.Codigo?.toString().trim();
    const estado = (r.Estado?.toString().trim()) || 'Activo';
    if (!aula_id || !tipo || !codigo) continue;
    await run(db, `INSERT INTO recursos (aula_id, tipo, codigo, estado) VALUES (?,?,?,?)`,
      [aula_id, tipo, codigo, estado]);
  }

  // Limpia filas inválidas en daños
  for (const d of danios) {
    if (!d.recurso_id || !d.descripcion) continue;
    const recurso_id = parseInt(d.recurso_id);
    const descripcion = d.descripcion?.toString().trim();
    const foto = d.foto?.toString().trim() || null;
    const estado = d.estado?.toString().trim() || 'reportado';
    const fecha = d.fecha?.toString().trim() || null;
    await run(db, `INSERT INTO danios (recurso_id, descripcion, foto, estado, fecha) VALUES (?,?,?,?,?)`,
      [recurso_id, descripcion, foto, estado, fecha]);
  }

  console.log('Seed completado desde /data CSVs con contraseñas bcrypt.');
}

await ensureSchema();
await seedIfEmpty();

// --- Auth ---
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, correo, contrasena, rol } = req.body;
    if (!correo || !contrasena || !nombre) return res.status(400).json({error:'Faltan datos'});
    const existing = await get(db, 'SELECT id FROM usuarios WHERE correo = ?', [correo.trim()]);
    if (existing) return res.status(409).json({error:'El correo ya está registrado'});
    let r = (rol||'instructor').toLowerCase();
    if (r === 'profesor') r = 'instructor';
    if (!['admin','tecnico','instructor'].includes(r)) r = 'instructor';
    const hash = await bcrypt.hash(contrasena, 10);
    await run(db, 'INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES (?,?,?,?)',
      [nombre.trim(), correo.trim(), hash, r]);
    res.json({ok:true});
  } catch (e) {
    console.error(e);
    res.status(500).json({error:'Error al registrar'});
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    const user = await get(db, 'SELECT * FROM usuarios WHERE correo = ?', [correo?.trim()]);
    if (!user) return res.status(401).json({error:'Credenciales inválidas'});
    const ok = await bcrypt.compare(contrasena || '', user.contrasena);
    if (!ok) return res.status(401).json({error:'Credenciales inválidas'});
    // respuesta mínima (sin JWT): frontend guarda en localStorage
    res.json({ ok:true, user: { id:user.id, nombre:user.nombre, rol:user.rol, correo:user.correo } });
  } catch (e) {
    console.error(e);
    res.status(500).json({error:'Error al iniciar sesión'});
  }
});

// --- API de Aulas/Recursos/Reservas/Daños ---
app.get('/api/aulas', async (req,res)=>{
  const rows = await all(db, 'SELECT * FROM aulas ORDER BY id ASC');
  res.json(rows);
});

app.get('/api/aulas/:id/recursos', async (req,res)=>{
  const rows = await all(db, 'SELECT * FROM recursos WHERE aula_id = ? ORDER BY id ASC',[req.params.id]);
  res.json(rows);
});

app.post('/api/reservas', async (req,res)=>{
  const { aula_id, usuario_id, fecha_inicio, fecha_fin } = req.body;
  if (!aula_id || !usuario_id || !fecha_inicio || !fecha_fin) return res.status(400).json({error:'Faltan datos'});
  await run(db, 'INSERT INTO reservas (aula_id, usuario_id, fecha_inicio, fecha_fin) VALUES (?,?,?,?)',
    [aula_id, usuario_id, fecha_inicio, fecha_fin]);
  await run(db, 'UPDATE aulas SET estado = ?, ocupado_por = ? WHERE id = ?',['Ocupada', String(usuario_id), aula_id]);
  res.json({ok:true});
});

app.post('/api/reservas/:id/liberar', async (req,res)=>{
  const { id } = req.params;
  const reserva = await get(db, 'SELECT aula_id FROM reservas WHERE id = ?', [id]);
  if (!reserva) return res.status(404).json({error:'No existe'});
  await run(db, 'UPDATE reservas SET estado = ? WHERE id = ?',['finalizada', id]);
  await run(db, 'UPDATE aulas SET estado = ?, ocupado_por = NULL WHERE id = ?',['Libre', reserva.aula_id]);
  res.json({ok:true});
});

app.post('/api/danios', async (req,res)=>{
  const { recurso_id, descripcion, foto } = req.body;
  if (!recurso_id || !descripcion) return res.status(400).json({error:'Faltan datos'});
  await run(db, 'INSERT INTO danios (recurso_id, descripcion, foto) VALUES (?,?,?)',[recurso_id, descripcion, foto||null]);
  res.json({ok:true});
});

// Fallback to index
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, ()=> console.log(`Servidor corriendo en ${PORT}`));
