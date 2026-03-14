// ============================================================
//  Good Luck — Service Worker para notificaciones push
//  Archivo: firebase-messaging-sw.js
//  Debe estar en la RAÍZ de tu sitio web (misma carpeta que index.html)
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// ⚠️ REEMPLAZA estos valores con los de tu proyecto Firebase
// Los encuentras en: Firebase Console → Tu proyecto → Configuración → General
firebase.initializeApp({
  apiKey:            "TU_API_KEY",
  authDomain:        "tu-proyecto.firebaseapp.com",
  projectId:         "tu-proyecto-id",
  storageBucket:     "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
});

const messaging = firebase.messaging();

// ─── Notificación en SEGUNDO PLANO ──────────────────────────
// Se activa cuando el usuario NO tiene la app abierta
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Notificación en segundo plano recibida:', payload);

  const { title, body, icon, data } = payload.notification;

  const notificationOptions = {
    body:  body  || '¡Alguien reportó algo similar a lo tuyo!',
    icon:  icon  || '/icon-192.png',
    badge: '/badge-72.png',
    tag:   'goodluck-match',          // agrupa notificaciones del mismo tipo
    renotify: true,
    vibrate: [200, 100, 200],
    data:  data  || {},
    actions: [
      { action: 'ver',    title: '👀 Ver coincidencia' },
      { action: 'cerrar', title: 'Más tarde'           }
    ]
  };

  return self.registration.showNotification(
    title || '🎯 Good Luck — Nueva coincidencia',
    notificationOptions
  );
});

// ─── Clic en la notificación ────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'cerrar') return;

  // Abre o enfoca la app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        // Si ya está abierta, la enfoca
        for (let client of windowClients) {
          if (client.url.includes('goodluck') && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no está abierta, la abre
        if (clients.openWindow) {
          return clients.openWindow('/?pantalla=notificaciones');
        }
      })
  );
});
