
# Intecap Aulas Pro v7.5 (Listo para Render)

## Requisitos
- Node 18+
- Render (Web Service)

## Instalación local
```bash
npm install
npm run seed   # opcional: genera db.sqlite desde /data con contraseñas en bcrypt
npm start
```

## Variables de entorno (.env)
```
PORT=3000
NODE_ENV=production
ORIGIN=https://<tu-dominio>.onrender.com
```

## Deploy en Render
1. Sube este repo a GitHub.
2. En Render > *New* > *Web Service* > conecta el repo.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Node:** 18+
6. Agrega variables de entorno (ENV): `PORT=10000` (Render gestiona), `NODE_ENV=production`.
7. Habilita Auto-Deploy si deseas.

> La base `db.sqlite` se crea/llena automáticamente al iniciar si no existe, usando los CSV en `/data`.
> Roles permitidos: `admin`, `tecnico`, `instructor`. `profesor` se normaliza a `instructor`.

## Accesos iniciales
- admin / admin  (hash bcrypt)
- tecnico / tecnico
- instructor / instructor  (antes "profesor")
