// ============================================================
//  Good Luck — Módulo cliente de notificaciones push
//  Archivo: push-client.js
//  Incluye este archivo en tu goodluck-app.html con:
//  <script src="push-client.js" type="module"></script>
// ============================================================

import { initializeApp }   from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getMessaging, getToken, onMessage }
                           from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging.js';

// ⚠️ REEMPLAZA con los datos de TU proyecto Firebase
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "tu-proyecto.firebaseapp.com",
  projectId:         "tu-proyecto-id",
  storageBucket:     "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
};

// ⚠️ REEMPLAZA con tu VAPID key de Firebase
// La encuentras en: Firebase Console → Configuración del proyecto
//   → Cloud Messaging → Certificados web push → Clave pública
const VAPID_KEY = "TU_VAPID_KEY_AQUI";

// ⚠️ URL de tu servidor backend (ver servidor.js)
const BACKEND_URL = "https://goodluck-server.onrender.com";

// ─── Inicialización ─────────────────────────────────────────
const app       = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ─── Solicitar permiso y registrar token ────────────────────
export async function iniciarNotificacionesPush(userId) {
  try {
    // 1. Verificar soporte del navegador
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return null;
    }

    // 2. Registrar el service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registrado ✅');

    // 3. Pedir permiso al usuario
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      console.warn('Permiso de notificaciones denegado');
      return null;
    }

    // 4. Obtener el token FCM del dispositivo
    const token = await getToken(messaging, {
      vapidKey:            VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.warn('No se pudo obtener el token FCM');
      return null;
    }

    console.log('Token FCM obtenido ✅:', token.substring(0, 20) + '...');

    // 5. Enviar el token a tu servidor para guardarlo
    await registrarTokenEnServidor(userId, token);
    return token;

  } catch (error) {
    console.error('Error al iniciar notificaciones push:', error);
    return null;
  }
}

// ─── Registrar token en el servidor ─────────────────────────
async function registrarTokenEnServidor(userId, token) {
  const res = await fetch(`${BACKEND_URL}/api/tokens`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ userId, token, plataforma: 'web' })
  });
  if (res.ok) console.log('Token guardado en servidor ✅');
}

// ─── Notificaciones en PRIMER PLANO (app abierta) ───────────
// Muestra el panel interno de notificaciones de Good Luck
onMessage(messaging, (payload) => {
  console.log('Notificación en primer plano recibida:', payload);

  const { title, body } = payload.notification;
  const data = payload.data || {};

  // Agregar a la lista interna de notificaciones de la app
  if (window.recibirNotificacionPush) {
    window.recibirNotificacionPush({
      id:    Date.now(),
      score: parseInt(data.score) || 75,
      unread: true,
      time:  'Ahora mismo',
      title,
      body,
      location: data.location || '',
    });
  }
});
