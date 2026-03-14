// ============================================================
//  Good Luck — Servidor backend de notificaciones push
//  Archivo: servidor.js
//  Ejecutar con: node servidor.js
//  Requiere: npm install express firebase-admin cors
// ============================================================

const express    = require('express');
const cors       = require('cors');
const admin      = require('firebase-admin');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Configuración Firebase Admin ───────────────────────────
// ⚠️ Descarga tu archivo serviceAccountKey.json desde:
//    Firebase Console → Configuración → Cuentas de servicio
//    → Generar nueva clave privada
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ─── Base de datos en memoria (reemplaza con MongoDB/PostgreSQL en producción) ─
// Estructura: { userId → [{ token, plataforma, fechaRegistro }] }
const tokensDB = new Map();

// ─── Publicaciones registradas ───────────────────────────────
// Estructura: [{ id, userId, tipo, categoria, titulo, descripcion, ubicacion, fechaCreacion }]
const publicaciones = [];

// ─── Palabras clave por categoría ───────────────────────────
const KEYWORDS = {
  'Mascota':   ['perro','gato','mascota','cachorro','collar','golden','retriever','siames','labrador'],
  'Bolso':     ['bolso','cartera','maletin','bolsa','mochila','negro','cuero'],
  'Documento': ['cedula','documento','pasaporte','tarjeta','licencia','carnet'],
  'Llaves':    ['llaves','llave','llavero','toyota','chevrolet','mazda'],
  'Celular':   ['celular','telefono','iphone','samsung','xiaomi','huawei'],
  'Vehiculo':  ['bicicleta','bici','moto','patineta','carro','auto'],
  'Joya':      ['anillo','collar','pulsera','aretes','cadena','reloj'],
};

const UBICACIONES = [
  'El Prado','Centro','Altos del Limón','Cabas','TransMetro',
  'Parque Bolívar','Manga','Bocagrande','El Campestre','Villa Country'
];

// ─── Funciones de matching ───────────────────────────────────
function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

function calcularScore(pubA, pubB) {
  if (pubA.tipo === pubB.tipo) return 0; // mismo tipo = no match
  let score = 0;

  // Categoría igual → alto puntaje
  if (pubA.categoria === pubB.categoria) score += 40;

  // Ubicación cercana
  const idxA = UBICACIONES.indexOf(pubA.ubicacion);
  const idxB = UBICACIONES.indexOf(pubB.ubicacion);
  if (pubA.ubicacion === pubB.ubicacion)          score += 35;
  else if (idxA >= 0 && Math.abs(idxA - idxB) <= 2) score += 15;

  // Palabras clave en común
  const textoA = normalizar(`${pubA.titulo} ${pubA.descripcion}`).split(/\s+/);
  const textoB = normalizar(`${pubB.titulo} ${pubB.descripcion}`).split(/\s+/);
  const kws = KEYWORDS[pubA.categoria] || [];
  kws.forEach(kw => { if (textoA.includes(kw) && textoB.includes(kw)) score += 10; });
  textoA.forEach(t => { if (t.length > 3 && textoB.includes(t)) score += 5; });

  return Math.min(score, 99);
}

// ─── Enviar notificación push FCM ───────────────────────────
async function enviarNotificacion(token, payload) {
  try {
    const mensaje = {
      token,
      notification: {
        title: payload.title,
        body:  payload.body,
      },
      data: {
        score:    String(payload.score),
        location: payload.location || '',
        tipo:     payload.tipo || 'match',
      },
      webpush: {
        notification: {
          icon:  '/icon-192.png',
          badge: '/badge-72.png',
          vibrate: [200, 100, 200],
          actions: [
            { action: 'ver',    title: '👀 Ver coincidencia' },
            { action: 'cerrar', title: 'Más tarde' }
          ]
        },
        fcmOptions: { link: '/?pantalla=notificaciones' }
      }
    };
    await admin.messaging().send(mensaje);
    console.log(`✅ Notificación enviada al token: ${token.substring(0,15)}...`);
    return true;
  } catch (error) {
    console.error(`❌ Error enviando notificación:`, error.message);
    return false;
  }
}

// ─── Buscar coincidencias y notificar ───────────────────────
async function procesarMatches(nuevaPublicacion) {
  console.log(`🔍 Buscando matches para: "${nuevaPublicacion.titulo}"`);
  let notificacionesEnviadas = 0;

  for (const pub of publicaciones) {
    if (pub.id === nuevaPublicacion.id) continue;
    if (pub.userId === nuevaPublicacion.userId) continue; // no notificarse a sí mismo

    const score = calcularScore(nuevaPublicacion, pub);
    if (score < 45) continue;

    console.log(`🎯 Match encontrado: score=${score}% entre "${nuevaPublicacion.titulo}" y "${pub.titulo}"`);

    // Notificar al dueño de la publicación existente
    const tokensUsuario = tokensDB.get(pub.userId) || [];
    for (const { token } of tokensUsuario) {
      const enviado = await enviarNotificacion(token, {
        title:    score >= 75 ? '🎯 ¡Coincidencia alta en Good Luck!' : '🔍 Posible coincidencia en Good Luck',
        body:     `Tu publicación "${pub.titulo}" tiene un ${score}% de similitud con "${nuevaPublicacion.titulo}" en ${nuevaPublicacion.ubicacion}.`,
        score,
        location: nuevaPublicacion.ubicacion,
      });
      if (enviado) notificacionesEnviadas++;
    }

    // Notificar también al usuario que acaba de publicar
    const tokensNuevo = tokensDB.get(nuevaPublicacion.userId) || [];
    for (const { token } of tokensNuevo) {
      const enviado = await enviarNotificacion(token, {
        title:    `🎯 ${score}% de coincidencia encontrada`,
        body:     `"${pub.titulo}" en ${pub.ubicacion} podría ser lo que buscas.`,
        score,
        location: pub.ubicacion,
      });
      if (enviado) notificacionesEnviadas++;
    }
  }

  console.log(`📬 Total notificaciones enviadas: ${notificacionesEnviadas}`);
}

// ═══════════════════════════════════════════════════════════
//  RUTAS DE LA API
// ═══════════════════════════════════════════════════════════

// POST /api/tokens — Guardar token FCM de un usuario
app.post('/api/tokens', (req, res) => {
  const { userId, token, plataforma } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ error: 'userId y token son requeridos' });
  }

  const entrada = { token, plataforma: plataforma || 'web', fechaRegistro: new Date() };
  const tokens  = tokensDB.get(userId) || [];

  // Evitar duplicados
  const existe = tokens.find(t => t.token === token);
  if (!existe) {
    tokens.push(entrada);
    tokensDB.set(userId, tokens);
    console.log(`📱 Token registrado para usuario ${userId}`);
  }

  res.json({ ok: true, mensaje: 'Token registrado correctamente' });
});

// POST /api/publicaciones — Crear publicación y buscar matches
app.post('/api/publicaciones', async (req, res) => {
  const { userId, tipo, categoria, titulo, descripcion, ubicacion } = req.body;

  if (!userId || !tipo || !titulo || !ubicacion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const nuevaPub = {
    id:           Date.now(),
    userId,
    tipo,         // 'lost' | 'found'
    categoria:    categoria || 'Otro',
    titulo,
    descripcion:  descripcion || '',
    ubicacion,
    fechaCreacion: new Date()
  };

  publicaciones.push(nuevaPub);
  console.log(`📝 Nueva publicación registrada: "${titulo}" (${tipo}) en ${ubicacion}`);

  // Buscar matches de forma asíncrona (no bloquea la respuesta)
  procesarMatches(nuevaPub).catch(console.error);

  res.json({ ok: true, publicacion: nuevaPub });
});

// GET /api/publicaciones — Listar todas las publicaciones
app.get('/api/publicaciones', (req, res) => {
  res.json({ publicaciones });
});

// GET /health — Verificar que el servidor funciona
app.get('/health', (req, res) => {
  res.json({
    estado:          'activo ✅',
    usuarios:        tokensDB.size,
    publicaciones:   publicaciones.length,
    fechaInicio:     new Date().toISOString()
  });
});

// ─── Iniciar servidor ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   Good Luck — Servidor Push activo  ║
  ║   Puerto: ${PORT}                       ║
  ║   http://localhost:${PORT}/health      ║
  ╚══════════════════════════════════════╝
  `);
});
