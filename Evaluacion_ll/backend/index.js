require('dotenv').config(); // Cargar env variables primero
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { generateSecret, generateURI, verifySync } = require('otplib');
const jwt = require('jsonwebtoken');
const pool = require('./db'); // Importamos la conexión
const app = express();
const serverPort = Number(process.env.PORT || 3000);
const serverHost = String(process.env.HOST || '0.0.0.0');
const adminEmail = String(process.env.ADMIN_EMAIL || 'admin@aegis.com').trim().toLowerCase();
const jwtSecret = process.env.JWT_SECRET || 'aegis_secret_key_123456';
let databaseAvailable = false;
let inMemoryUserId = 1;
const inMemoryUsers = [];
const wikiSseClients = new Set();
const watchedTables = ['armas', 'armaduras', 'hechizos', 'milagros', 'clases', 'talismanes', 'personajes', 'builds'];
let lastWikiSignatures = null;
const mfaLoginChallenges = new Map();

const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  ...String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origen no permitido por CORS'));
  }
};

function hasAdminAccess(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return false;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return decoded.role === 'admin';
  } catch (err) {
    console.error('Error al validar token de admin:', err.message);
    return false;
  }
}

function ensureAdmin(req, res) {
  if (hasAdminAccess(req)) {
    return true;
  }

  res.status(403).json({ message: 'Acceso solo para administradores.' });
  return false;
}

async function logAuditoria(usuario, req, accion) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const cleanIp = ip.replace(/^.*ffff:/, '').replace(/^.*:/, '');
    await pool.query(
      'INSERT INTO bitacora (usuario, ip_address, accion) VALUES ($1, $2, $3)',
      [usuario || 'Anónimo', cleanIp, accion]
    );
    console.log(`[AUDIT] User: ${usuario || 'Anónimo'} | IP: ${cleanIp} | Action: ${accion}`);
  } catch (err) {
    console.error('Error al registrar auditoría:', err.message);
  }
}

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('AEGIS Wiki API OK');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

async function initDatabase() {
  console.log('Iniciando base de datos...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(80) NOT NULL,
        email VARCHAR(120) UNIQUE NOT NULL,
        role VARCHAR(16) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'user'
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS mfa_secret TEXT
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS mfa_temp_secret TEXT
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS intentos_fallidos INT NOT NULL DEFAULT 0
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP DEFAULT NULL
    `);

    await pool.query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS permisos TEXT[] NOT NULL DEFAULT '{}'
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bitacora (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(120) NOT NULL,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        hora TIME NOT NULL DEFAULT CURRENT_TIME,
        ip_address VARCHAR(45) NOT NULL,
        accion VARCHAR(255) NOT NULL
      )
    `);

    await pool.query(`
      UPDATE usuarios
      SET role = CASE
        WHEN LOWER(email) = $1 THEN 'admin'
        ELSE 'user'
      END
      WHERE role IS NULL OR role NOT IN ('admin', 'user')
    `, [adminEmail]);

    console.log('Tabla usuarios verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tipos_arma (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla tipos_arma verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS armas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        tipo_id INT REFERENCES tipos_arma(id) ON DELETE SET NULL,
        rareza SMALLINT NOT NULL DEFAULT 1 CHECK (rareza BETWEEN 1 AND 5),
        peso NUMERIC(5,2) NOT NULL DEFAULT 0,
        escalado VARCHAR(40),
        descripcion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla armas verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS clases (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL UNIQUE,
        enfoque VARCHAR(80) NOT NULL,
        vigor SMALLINT NOT NULL DEFAULT 10,
        mente SMALLINT NOT NULL DEFAULT 10,
        resistencia SMALLINT NOT NULL DEFAULT 10,
        fuerza SMALLINT NOT NULL DEFAULT 10,
        destreza SMALLINT NOT NULL DEFAULT 10,
        inteligencia SMALLINT NOT NULL DEFAULT 10,
        fe SMALLINT NOT NULL DEFAULT 10,
        arcano SMALLINT NOT NULL DEFAULT 10,
        descripcion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla clases verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS armaduras (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        categoria VARCHAR(50) NOT NULL,
        peso NUMERIC(5,2) NOT NULL DEFAULT 0,
        defensa_fisica NUMERIC(6,2) NOT NULL DEFAULT 0,
        defensa_magica NUMERIC(6,2) NOT NULL DEFAULT 0,
        descripcion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla armaduras verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hechizos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        costo_fp SMALLINT NOT NULL DEFAULT 0,
        requisitos VARCHAR(120),
        descripcion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla hechizos verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS milagros (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        costo_fp SMALLINT NOT NULL DEFAULT 0,
        requisitos VARCHAR(120),
        descripcion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla milagros verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS talismanes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        efecto TEXT NOT NULL,
        ubicacion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla talismanes verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS personajes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        faccion VARCHAR(120),
        zona VARCHAR(120),
        descripcion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla personajes verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS builds (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL UNIQUE,
        enfoque VARCHAR(80) NOT NULL,
        nivel_recomendado VARCHAR(40),
        distribucion_puntos VARCHAR(180),
        descripcion TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Tabla builds verificada');

    await pool.query(`
      ALTER TABLE builds
      ADD COLUMN IF NOT EXISTS nivel_recomendado VARCHAR(40)
    `);

    await pool.query(`
      ALTER TABLE builds
      ADD COLUMN IF NOT EXISTS distribucion_puntos VARCHAR(180)
    `);

    databaseAvailable = true;
    console.log('✅ Base de datos iniciada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error.message);
    databaseAvailable = false;
  }
}

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isStrongPassword(password) {
  if (!password || password.length < 8) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[\W_]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecial;
}

function buildSessionUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    role: user.role,
    mfaEnabled: Boolean(user.mfa_enabled)
  };
}

function createMfaChallenge(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + (2 * 60 * 1000);
  mfaLoginChallenges.set(token, { userId, expiresAt });
  return token;
}

function readMfaChallenge(token) {
  const challenge = mfaLoginChallenges.get(token);
  if (!challenge) {
    return null;
  }

  if (Date.now() > challenge.expiresAt) {
    mfaLoginChallenges.delete(token);
    return null;
  }

  return challenge;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, challenge] of mfaLoginChallenges.entries()) {
    if (now > challenge.expiresAt) {
      mfaLoginChallenges.delete(token);
    }
  }
}, 30 * 1000);

function broadcastWikiUpdate(payload) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of wikiSseClients) {
    client.write(message);
  }
}

async function getTableSignature(tableName) {
  const result = await pool.query(
    `
      SELECT COALESCE(md5(string_agg(row_text, '|' ORDER BY row_text)), '') AS signature
      FROM (
        SELECT row_to_json(t)::text AS row_text
        FROM ${tableName} t
      ) rows
    `
  );

  return result.rows[0]?.signature ?? '';
}

async function computeWikiSignatures() {
  if (!databaseAvailable) {
    return null;
  }

  const signatures = {};
  for (const tableName of watchedTables) {
    signatures[tableName] = await getTableSignature(tableName);
  }

  return signatures;
}

function getChangedTables(previousSignatures, currentSignatures) {
  const changed = [];
  for (const tableName of watchedTables) {
    if (previousSignatures[tableName] !== currentSignatures[tableName]) {
      changed.push(tableName);
    }
  }
  return changed;
}

function startWikiWatcher() {
  let running = false;

  setInterval(async () => {
    if (running || !databaseAvailable) {
      return;
    }

    running = true;
    try {
      const currentSignatures = await computeWikiSignatures();
      if (!currentSignatures) {
        return;
      }

      if (!lastWikiSignatures) {
        lastWikiSignatures = currentSignatures;
        return;
      }

      const changedTables = getChangedTables(lastWikiSignatures, currentSignatures);
      if (changedTables.length > 0) {
        lastWikiSignatures = currentSignatures;
        broadcastWikiUpdate({
          type: 'wiki-update',
          timestamp: new Date().toISOString(),
          tables: changedTables
        });
      }
    } catch (error) {
      console.error('Error detectando cambios en la wiki:', error.message);
    } finally {
      running = false;
    }
  }, 3000);

  setInterval(() => {
    broadcastWikiUpdate({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    });
  }, 25000);
}

app.get('/events/wiki', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  wikiSseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    wikiSseClients.delete(res);
  });
});

app.post('/auth/register', async (req, res) => {
  const { nombre, email, password } = req.body ?? {};
  if (!nombre || !email || !password) {
    return res.status(400).json({ message: 'Nombre, correo y contraseña son obligatorios.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Correo electrónico no válido.' });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const role = normalizedEmail === adminEmail ? 'admin' : 'user';
    const passwordHash = await bcrypt.hash(String(password), 10);

    if (databaseAvailable) {
      const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [normalizedEmail]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ message: 'El correo ya está registrado.' });
      }

      const result = await pool.query(
        'INSERT INTO usuarios (nombre, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, role, mfa_enabled',
        [String(nombre).trim(), normalizedEmail, role, passwordHash]
      );

      await logAuditoria(normalizedEmail, req, 'Registro de usuario');

      return res.status(201).json({
        message: 'Registro completado.',
        user: buildSessionUser(result.rows[0])
      });
    }

    const existingMemoryUser = inMemoryUsers.find((user) => user.email === normalizedEmail);
    if (existingMemoryUser) {
      return res.status(409).json({ message: 'El correo ya está registrado.' });
    }

    const newUser = {
      id: inMemoryUserId++,
      nombre: String(nombre).trim(),
      email: normalizedEmail,
      role,
      passwordHash,
      mfa_enabled: false,
      mfa_secret: null,
      mfa_temp_secret: null
    };
    inMemoryUsers.push(newUser);

    await logAuditoria(normalizedEmail, req, 'Registro de usuario (modo local)');

    return res.status(201).json({
      message: 'Registro completado (modo local).',
      user: {
        id: newUser.id,
        nombre: newUser.nombre,
        email: newUser.email,
        role: newUser.role,
        mfaEnabled: false
      }
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (databaseAvailable) {
      const result = await pool.query(
        'SELECT id, nombre, email, role, password_hash, mfa_enabled, mfa_secret, activo, intentos_fallidos, bloqueado_hasta FROM usuarios WHERE email = $1',
        [normalizedEmail]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ message: 'Credenciales incorrectas.' });
      }

      const user = result.rows[0];

      if (!user.activo) {
        await logAuditoria(normalizedEmail, req, 'Intento de ingreso (cuenta desactivada)');
        return res.status(403).json({ message: 'Tu cuenta ha sido desactivada por el administrador.' });
      }

      if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
        const remaining = Math.ceil((new Date(user.bloqueado_hasta).getTime() - Date.now()) / 60000);
        await logAuditoria(normalizedEmail, req, 'Intento de ingreso (cuenta bloqueada temporalmente)');
        return res.status(403).json({ message: `Esta cuenta está bloqueada temporalmente. Intente nuevamente en ${remaining} minutos.` });
      }

      const isMatch = await bcrypt.compare(String(password), user.password_hash);
      if (!isMatch) {
        const attempts = (user.intentos_fallidos || 0) + 1;
        let lockUntil = null;
        let msg = 'Credenciales incorrectas.';
        
        if (attempts >= 3) {
          lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await pool.query(
            'UPDATE usuarios SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE id = $3',
            [attempts, lockUntil, user.id]
          );
          await logAuditoria(normalizedEmail, req, 'Bloqueo temporal de cuenta por intentos fallidos');
          msg = 'Credenciales incorrectas. La cuenta ha sido bloqueada temporalmente por 15 minutos.';
        } else {
          await pool.query(
            'UPDATE usuarios SET intentos_fallidos = $1 WHERE id = $2',
            [attempts, user.id]
          );
          await logAuditoria(normalizedEmail, req, 'Intento fallido de inicio de sesión');
        }
        return res.status(401).json({ message: msg });
      }

      await pool.query(
        'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1',
        [user.id]
      );

      if (user.mfa_enabled && user.mfa_secret) {
        return res.json({
          message: 'Se requiere verificación de dos pasos.',
          mfaRequired: true,
          mfaToken: createMfaChallenge(user.id)
        });
      }

      await logAuditoria(normalizedEmail, req, 'Inicio de sesión');
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '24h' });
      return res.json({
        message: 'Inicio de sesión exitoso.',
        user: buildSessionUser(user),
        token: token
      });
    }

    const user = inMemoryUsers.find((item) => item.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    if (user.activo === false) {
      return res.status(403).json({ message: 'Tu cuenta ha sido desactivada por el administrador.' });
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      await logAuditoria(normalizedEmail, req, 'Intento fallido de inicio de sesión (modo local)');
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    if (user.mfa_enabled && user.mfa_secret) {
      return res.json({
        message: 'Se requiere verificación de dos pasos.',
        mfaRequired: true,
        mfaToken: createMfaChallenge(user.id)
      });
    }

    await logAuditoria(normalizedEmail, req, 'Inicio de sesión (modo local)');
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, jwtSecret, { expiresIn: '24h' });
    return res.json({
      message: 'Inicio de sesión exitoso (modo local).',
      user: buildSessionUser(user),
      token: token
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.post('/auth/mfa/login/verify', async (req, res) => {
  const { mfaToken, code } = req.body ?? {};
  if (!mfaToken || !code) {
    return res.status(400).json({ message: 'Token MFA y código son obligatorios.' });
  }

  try {
    const challenge = readMfaChallenge(String(mfaToken));
    if (!challenge) {
      return res.status(401).json({ message: 'El desafío MFA expiró o no es válido.' });
    }

    if (databaseAvailable) {
      const result = await pool.query(
        'SELECT id, nombre, email, role, mfa_enabled, mfa_secret FROM usuarios WHERE id = $1',
        [challenge.userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const user = result.rows[0];
      if (!user.mfa_enabled || !user.mfa_secret) {
        return res.status(400).json({ message: 'El usuario no tiene MFA habilitado.' });
      }

      const verifyResult = verifySync({ token: String(code).trim(), secret: user.mfa_secret, window: 1, step: 30 });
      if (!verifyResult?.valid) {
        await logAuditoria(user.email, req, 'Intento de inicio de sesión fallido (MFA inválido)');
        return res.status(401).json({ message: 'Código de verificación inválido.' });
      }

      mfaLoginChallenges.delete(String(mfaToken));
      await logAuditoria(user.email, req, 'Inicio de sesión (MFA verificado)');
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '24h' });
      return res.json({
        message: 'Inicio de sesión exitoso con MFA.',
        user: buildSessionUser(user),
        token: token
      });
    }

    const user = inMemoryUsers.find((item) => item.id === challenge.userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (!user.mfa_enabled || !user.mfa_secret) {
      return res.status(400).json({ message: 'El usuario no tiene MFA habilitado.' });
    }

    const verifyResult = verifySync({ token: String(code).trim(), secret: user.mfa_secret, window: 1, step: 30 });
    if (!verifyResult?.valid) {
      await logAuditoria(user.email, req, 'Intento de inicio de sesión fallido (MFA inválido, local)');
      return res.status(401).json({ message: 'Código de verificación inválido.' });
    }

    mfaLoginChallenges.delete(String(mfaToken));
    await logAuditoria(user.email, req, 'Inicio de sesión (MFA verificado, local)');
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, jwtSecret, { expiresIn: '24h' });
    return res.json({
      message: 'Inicio de sesión exitoso con MFA (modo local).',
      user: buildSessionUser(user),
      token: token
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.get('/auth/mfa/status/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ message: 'ID de usuario inválido.' });
  }

  try {
    if (databaseAvailable) {
      const result = await pool.query('SELECT mfa_enabled FROM usuarios WHERE id = $1', [userId]);
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      return res.json({ mfaEnabled: Boolean(result.rows[0].mfa_enabled) });
    }

    const user = inMemoryUsers.find((item) => item.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.json({ mfaEnabled: Boolean(user.mfa_enabled) });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.post('/auth/mfa/setup/start', async (req, res) => {
  const { userId } = req.body ?? {};
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return res.status(400).json({ message: 'ID de usuario inválido.' });
  }

  try {
    const secret = generateSecret();

    if (databaseAvailable) {
      const userResult = await pool.query('SELECT id, email, mfa_enabled FROM usuarios WHERE id = $1', [numericUserId]);
      if (userResult.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      if (userResult.rows[0].mfa_enabled) {
        return res.status(409).json({ message: 'MFA ya está habilitado para este usuario.' });
      }

      await pool.query('UPDATE usuarios SET mfa_temp_secret = $1 WHERE id = $2', [secret, numericUserId]);
      const otpAuthUrl = generateURI({
        secret,
        issuer: 'AEGIS Wiki',
        label: userResult.rows[0].email,
        step: 30,
        digits: 6
      });
      const qrImageDataUrl = await QRCode.toDataURL(otpAuthUrl);

      return res.json({ message: 'Escanea el QR y confirma con un código.', qrImageDataUrl, otpAuthUrl });
    }

    const user = inMemoryUsers.find((item) => item.id === numericUserId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (user.mfa_enabled) {
      return res.status(409).json({ message: 'MFA ya está habilitado para este usuario.' });
    }

    user.mfa_temp_secret = secret;
    const otpAuthUrl = generateURI({
      secret,
      issuer: 'AEGIS Wiki',
      label: user.email,
      step: 30,
      digits: 6
    });
    const qrImageDataUrl = await QRCode.toDataURL(otpAuthUrl);
    return res.json({ message: 'Escanea el QR y confirma con un código.', qrImageDataUrl, otpAuthUrl });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.post('/auth/mfa/setup/confirm', async (req, res) => {
  const { userId, code } = req.body ?? {};
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0 || !code) {
    return res.status(400).json({ message: 'ID de usuario y código son obligatorios.' });
  }

  try {
    if (databaseAvailable) {
      const userResult = await pool.query(
        'SELECT mfa_temp_secret, mfa_enabled FROM usuarios WHERE id = $1',
        [numericUserId]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const user = userResult.rows[0];
      if (user.mfa_enabled) {
        return res.status(409).json({ message: 'MFA ya está habilitado para este usuario.' });
      }

      if (!user.mfa_temp_secret) {
        return res.status(400).json({ message: 'No hay un proceso de configuración MFA activo.' });
      }

      const verifyResult = verifySync({ token: String(code).trim(), secret: user.mfa_temp_secret, window: 1, step: 30 });
      if (!verifyResult?.valid) {
        return res.status(401).json({ message: 'Código de verificación inválido.' });
      }

      await pool.query(
        'UPDATE usuarios SET mfa_enabled = TRUE, mfa_secret = mfa_temp_secret, mfa_temp_secret = NULL WHERE id = $1',
        [numericUserId]
      );

      return res.json({ message: 'MFA activado correctamente.', mfaEnabled: true });
    }

    const user = inMemoryUsers.find((item) => item.id === numericUserId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (user.mfa_enabled) {
      return res.status(409).json({ message: 'MFA ya está habilitado para este usuario.' });
    }

    if (!user.mfa_temp_secret) {
      return res.status(400).json({ message: 'No hay un proceso de configuración MFA activo.' });
    }

    const verifyResult = verifySync({ token: String(code).trim(), secret: user.mfa_temp_secret, window: 1, step: 30 });
    if (!verifyResult?.valid) {
      return res.status(401).json({ message: 'Código de verificación inválido.' });
    }

    user.mfa_enabled = true;
    user.mfa_secret = user.mfa_temp_secret;
    user.mfa_temp_secret = null;
    return res.json({ message: 'MFA activado correctamente (modo local).', mfaEnabled: true });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.post('/auth/mfa/disable', async (req, res) => {
  const { userId, code } = req.body ?? {};
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0 || !code) {
    return res.status(400).json({ message: 'ID de usuario y código son obligatorios.' });
  }

  try {
    if (databaseAvailable) {
      const userResult = await pool.query('SELECT mfa_enabled, mfa_secret FROM usuarios WHERE id = $1', [numericUserId]);
      if (userResult.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }

      const user = userResult.rows[0];
      if (!user.mfa_enabled || !user.mfa_secret) {
        return res.status(400).json({ message: 'MFA no está habilitado para este usuario.' });
      }

      const verifyResult = verifySync({ token: String(code).trim(), secret: user.mfa_secret, window: 1, step: 30 });
      if (!verifyResult?.valid) {
        return res.status(401).json({ message: 'Código de verificación inválido.' });
      }

      await pool.query('UPDATE usuarios SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_temp_secret = NULL WHERE id = $1', [numericUserId]);
      return res.json({ message: 'MFA desactivado correctamente.', mfaEnabled: false });
    }

    const user = inMemoryUsers.find((item) => item.id === numericUserId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    if (!user.mfa_enabled || !user.mfa_secret) {
      return res.status(400).json({ message: 'MFA no está habilitado para este usuario.' });
    }

    const verifyResult = verifySync({ token: String(code).trim(), secret: user.mfa_secret, window: 1, step: 30 });
    if (!verifyResult?.valid) {
      return res.status(401).json({ message: 'Código de verificación inválido.' });
    }

    user.mfa_enabled = false;
    user.mfa_secret = null;
    user.mfa_temp_secret = null;
    return res.json({ message: 'MFA desactivado correctamente (modo local).', mfaEnabled: false });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.post('/auth/logout', async (req, res) => {
  const { email } = req.body ?? {};
  if (email) {
    await logAuditoria(email, req, 'Cierre de sesión');
  }
  return res.json({ message: 'Sesión cerrada.' });
});

app.put('/auth/profile', async (req, res) => {
  const { id, nombre, email } = req.body ?? {};
  if (!id || !nombre) {
    return res.status(400).json({ message: 'ID y nombre son obligatorios.' });
  }
  try {
    if (databaseAvailable) {
      await pool.query(
        'UPDATE usuarios SET nombre = $1 WHERE id = $2',
        [String(nombre).trim(), id]
      );
      await logAuditoria(email, req, `Edición de perfil (Cambio de nombre: ${nombre})`);
      return res.json({ message: 'Perfil actualizado correctamente.' });
    }
    const user = inMemoryUsers.find((item) => item.id === id);
    if (user) {
      user.nombre = String(nombre).trim();
    }
    await logAuditoria(email, req, `Edición de perfil local (nombre: ${nombre})`);
    return res.json({ message: 'Perfil actualizado correctamente.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.put('/auth/password', async (req, res) => {
  const { id, email, oldPassword, newPassword } = req.body ?? {};
  if (!id || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ message: 'La contraseña nueva no cumple con las políticas de seguridad (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo).' });
  }
  try {
    if (databaseAvailable) {
      const result = await pool.query(
        'SELECT password_hash FROM usuarios WHERE id = $1',
        [id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(String(oldPassword), user.password_hash);
      if (!isMatch) {
        await logAuditoria(email, req, 'Intento fallido de cambio de contraseña (clave actual errónea)');
        return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
      }
      const newHash = await bcrypt.hash(String(newPassword), 10);
      await pool.query(
        'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
        [newHash, id]
      );
      await logAuditoria(email, req, 'Cambio de contraseña');
      return res.json({ message: 'Contraseña actualizada correctamente.' });
    }
    const user = inMemoryUsers.find((item) => item.id === id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    const isMatch = await bcrypt.compare(String(oldPassword), user.passwordHash);
    if (!isMatch) {
      await logAuditoria(email, req, 'Intento fallido de cambio de contraseña (local, clave actual errónea)');
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }
    const newHash = await bcrypt.hash(String(newPassword), 10);
    user.passwordHash = newHash;
    await logAuditoria(email, req, 'Cambio de contraseña (local)');
    return res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.get('/admin/usuarios', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    if (databaseAvailable) {
      const result = await pool.query(
        'SELECT id, nombre, email, role, activo, permisos FROM usuarios ORDER BY id ASC'
      );
      return res.json(result.rows);
    }
    return res.json(inMemoryUsers.map(u => ({ id: u.id, nombre: u.nombre, email: u.email, role: u.role, activo: u.activo !== false, permisos: u.permisos || [] })));
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.post('/admin/usuarios', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const { nombre, email, password, role, permisos } = req.body ?? {};
  if (!nombre || !email || !password || !role) {
    return res.status(400).json({ message: 'Nombre, correo, contraseña y rol son obligatorios.' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Correo electrónico no válido.' });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.' });
  }
  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(String(password), 10);
    const perms = permisos || [];
    const adminUserEmail = String(req.headers['x-user-email'] || 'admin@aegis.com').trim().toLowerCase();

    if (databaseAvailable) {
      const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [normalizedEmail]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ message: 'El correo ya está registrado.' });
      }
      await pool.query(
        'INSERT INTO usuarios (nombre, email, role, password_hash, permisos) VALUES ($1, $2, $3, $4, $5)',
        [String(nombre).trim(), normalizedEmail, role, passwordHash, perms]
      );
      await logAuditoria(adminUserEmail, req, `Alta de usuario (Email: ${normalizedEmail}, Rol: ${role})`);
      return res.status(201).json({ message: 'Usuario creado exitosamente.' });
    }
    const existing = inMemoryUsers.find(u => u.email === normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'El correo ya está registrado.' });
    }
    inMemoryUsers.push({
      id: inMemoryUserId++,
      nombre: String(nombre).trim(),
      email: normalizedEmail,
      role,
      passwordHash,
      activo: true,
      permisos: perms
    });
    await logAuditoria(adminUserEmail, req, `Alta de usuario local (Email: ${normalizedEmail}, Rol: ${role})`);
    return res.status(201).json({ message: 'Usuario creado exitosamente.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.put('/admin/usuarios/:id', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const userId = Number(req.params.id);
  const { nombre, role, activo, permisos } = req.body ?? {};
  const adminUserEmail = String(req.headers['x-user-email'] || 'admin@aegis.com').trim().toLowerCase();

  try {
    if (databaseAvailable) {
      const oldRes = await pool.query('SELECT nombre, role, activo, email FROM usuarios WHERE id = $1', [userId]);
      if (oldRes.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      const old = oldRes.rows[0];
      
      await pool.query(
        'UPDATE usuarios SET nombre = $1, role = $2, activo = $3, permisos = $4 WHERE id = $5',
        [String(nombre).trim(), role, activo, permisos || [], userId]
      );

      let auditMsg = `Edición de usuario (${old.email})`;
      if (old.role !== role) auditMsg += ` (Cambio de rol: ${old.role} -> ${role})`;
      if (old.activo !== activo) auditMsg += ` (Estado activo: ${old.activo} -> ${activo})`;
      
      await logAuditoria(adminUserEmail, req, auditMsg);
      return res.json({ message: 'Usuario actualizado correctamente.' });
    }
    const user = inMemoryUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    user.nombre = String(nombre).trim();
    user.role = role;
    user.activo = activo;
    user.permisos = permisos || [];
    await logAuditoria(adminUserEmail, req, `Edición de usuario local (${user.email})`);
    return res.json({ message: 'Usuario actualizado correctamente.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.delete('/admin/usuarios/:id', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const userId = Number(req.params.id);
  const adminUserEmail = String(req.headers['x-user-email'] || 'admin@aegis.com').trim().toLowerCase();

  try {
    if (databaseAvailable) {
      const oldRes = await pool.query('SELECT email FROM usuarios WHERE id = $1', [userId]);
      if (oldRes.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      await pool.query('UPDATE usuarios SET activo = false WHERE id = $1', [userId]);
      await logAuditoria(adminUserEmail, req, `Eliminación lógica de usuario (${oldRes.rows[0].email})`);
      return res.json({ message: 'Usuario desactivado lógicamente.' });
    }
    const user = inMemoryUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    user.activo = false;
    await logAuditoria(adminUserEmail, req, `Eliminación lógica de usuario local (${user.email})`);
    return res.json({ message: 'Usuario desactivado lógicamente.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.put('/admin/usuarios/:id/password', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  const userId = Number(req.params.id);
  const { newPassword } = req.body ?? {};
  const adminUserEmail = String(req.headers['x-user-email'] || 'admin@aegis.com').trim().toLowerCase();

  if (!newPassword || !isStrongPassword(newPassword)) {
    return res.status(400).json({ message: 'La contraseña nueva no cumple con las políticas de seguridad.' });
  }

  try {
    const newHash = await bcrypt.hash(String(newPassword), 10);
    if (databaseAvailable) {
      const oldRes = await pool.query('SELECT email FROM usuarios WHERE id = $1', [userId]);
      if (oldRes.rowCount === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [newHash, userId]);
      await logAuditoria(adminUserEmail, req, `Restablecimiento de contraseña de usuario (${oldRes.rows[0].email})`);
      return res.json({ message: 'Contraseña restablecida exitosamente.' });
    }
    const user = inMemoryUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    user.passwordHash = newHash;
    await logAuditoria(adminUserEmail, req, `Restablecimiento de contraseña de usuario local (${user.email})`);
    return res.json({ message: 'Contraseña restablecida exitosamente.' });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

app.get('/admin/bitacora', async (req, res) => {
  if (!ensureAdmin(req, res)) return;
  try {
    if (databaseAvailable) {
      const result = await pool.query(
        'SELECT id, usuario, fecha::text, hora::text, ip_address, accion FROM bitacora ORDER BY id DESC LIMIT 100'
      );
      return res.json(result.rows);
    }
    return res.json([]);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: 'Error en el servidor.' });
  }
});

let sseClients = [];

app.get('/sync/subscribe', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

app.post('/sync/publish', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No autorizado. Token no proporcionado.' });
  }
  try {
    jwt.verify(token, jwtSecret);
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido o expirado.' });
  }

  const { event, data } = req.body ?? {};
  if (!event) {
    return res.status(400).json({ message: 'El nombre del evento es obligatorio.' });
  }

  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify({ event, data })}\n\n`);
    } catch (e) {
      console.error('Error al notificar cliente SSE:', e.message);
    }
  });

  return res.json({ message: 'Evento publicado correctamente.' });
});

// Ruta para ver todas las armas de tu Wiki
app.get('/armas', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }

    const resultado = await pool.query('SELECT a.*, t.nombre AS tipo FROM armas a LEFT JOIN tipos_arma t ON a.tipo_id = t.id');
    const rowsWithDamage = resultado.rows.map(row => {
      const rareza = Number(row.rareza || 1);
      const peso = Number(row.peso || 0);
      const calculatedDano = 80 + (rareza * 10) + Math.round(peso * 2.5);
      return {
        ...row,
        dano_base: calculatedDano
      };
    });

    res.json(rowsWithDamage);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

app.get('/tipos-arma', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }

    const resultado = await pool.query('SELECT id, nombre FROM tipos_arma ORDER BY nombre ASC');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

app.post('/armas', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  if (!databaseAvailable) {
    return res.status(503).json({ message: 'Base de datos no disponible.' });
  }

  const { nombre, tipo_id, rareza, peso, escalado, descripcion } = req.body ?? {};
  const safeName = String(nombre || '').trim();
  if (!safeName) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' });
  }

  const safeRareza = Number.isFinite(Number(rareza)) ? Number(rareza) : 1;
  const safePeso = Number.isFinite(Number(peso)) ? Number(peso) : 0;
  const safeTipoId = Number.isFinite(Number(tipo_id)) ? Number(tipo_id) : null;

  try {
    const insert = await pool.query(
      `
        INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [
        safeName,
        safeTipoId,
        Math.min(Math.max(safeRareza, 1), 5),
        Math.max(safePeso, 0),
        String(escalado || '').trim() || null,
        String(descripcion || '').trim() || null
      ]
    );

    // Notificar a los clientes SSE
    broadcastWikiUpdate({ table: 'armas' });

    return res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('Error al crear arma:', err.message);
    
    if (err.code === '23505') {
      return res.status(409).json({ message: `El arma "${safeName}" ya existe.` });
    }
    
    return res.status(500).json({ message: 'No se pudo crear el arma: ' + err.message });
  }
});

app.put('/armas/:id', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  if (!databaseAvailable) {
    return res.status(503).json({ message: 'Base de datos no disponible.' });
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'ID invalido.' });
  }

  const { nombre, tipo_id, rareza, peso, escalado, descripcion } = req.body ?? {};
  const safeName = String(nombre || '').trim();
  if (!safeName) {
    return res.status(400).json({ message: 'El nombre es obligatorio.' });
  }

  const safeRareza = Number.isFinite(Number(rareza)) ? Number(rareza) : 1;
  const safePeso = Number.isFinite(Number(peso)) ? Number(peso) : 0;
  const safeTipoId = Number.isFinite(Number(tipo_id)) ? Number(tipo_id) : null;

  try {
    const update = await pool.query(
      `
        UPDATE armas
        SET
          nombre = $1,
          tipo_id = $2,
          rareza = $3,
          peso = $4,
          escalado = $5,
          descripcion = $6,
          updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `,
      [
        safeName,
        safeTipoId,
        Math.min(Math.max(safeRareza, 1), 5),
        Math.max(safePeso, 0),
        String(escalado || '').trim() || null,
        String(descripcion || '').trim() || null,
        id
      ]
    );

    if (update.rowCount === 0) {
      return res.status(404).json({ message: 'Arma no encontrada.' });
    }

    // Notificar a los clientes SSE
    broadcastWikiUpdate({ table: 'armas' });

    return res.json(update.rows[0]);
  } catch (err) {
    console.error('Error al actualizar arma:', err.message);
    
    if (err.code === '23505') {
      return res.status(409).json({ message: `El arma "${safeName}" ya existe.` });
    }
    
    return res.status(500).json({ message: 'No se pudo actualizar el arma: ' + err.message });
  }
});

app.delete('/armas/:id', async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  if (!databaseAvailable) {
    return res.status(503).json({ message: 'Base de datos no disponible.' });
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'ID invalido.' });
  }

  try {
    const deleted = await pool.query('DELETE FROM armas WHERE id = $1 RETURNING id', [id]);
    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: 'Arma no encontrada.' });
    }

    // Notificar a los clientes SSE
    broadcastWikiUpdate({ table: 'armas' });

    return res.json({ message: 'Arma eliminada.' });
  } catch (err) {
    console.error('Error al eliminar arma:', err.message);
    return res.status(500).json({ message: 'No se pudo eliminar el arma: ' + err.message });
  }
});

// Endpoint para armaduras
app.get('/armaduras', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }
    const resultado = await pool.query('SELECT * FROM armaduras');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint para hechizos
app.get('/hechizos', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }
    const resultado = await pool.query('SELECT * FROM hechizos');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint para milagros
app.get('/milagros', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }
    const resultado = await pool.query('SELECT * FROM milagros');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint para clases
app.get('/clases', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }
    const resultado = await pool.query('SELECT * FROM clases ORDER BY id ASC');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint para talismanes
app.get('/talismanes', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }
    const resultado = await pool.query('SELECT * FROM talismanes');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint para personajes
app.get('/personajes', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }
    const resultado = await pool.query('SELECT * FROM personajes');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

// Endpoint para builds
app.get('/builds', async (req, res) => {
  try {
    if (!databaseAvailable) {
      return res.json([]);
    }
    const resultado = await pool.query('SELECT * FROM builds');
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error en el servidor");
  }
});

async function startServer() {
  try {
    await initDatabase();
    startWikiWatcher();
    app.listen(serverPort, serverHost, () => {
      console.log(`Servidor AEGIS corriendo en ${serverHost}:${serverPort}`);
    });
  } catch (error) {
    console.error('Error al arrancar el servidor:', error.message);
    process.exitCode = 1;
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
startServer();
