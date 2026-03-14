# 🍀 Good Luck — Guía completa para activar notificaciones push reales

## ¿Qué vas a lograr?
Al terminar esta guía tu app enviará notificaciones push reales al celular
de los usuarios cuando detecte una coincidencia entre objetos perdidos y encontrados.

---

## PARTE 1 — Configurar Firebase (15 minutos, gratis)

### Paso 1: Crear proyecto en Firebase
1. Ve a https://console.firebase.google.com
2. Haz clic en **"Crear un proyecto"**
3. Nombre del proyecto: `good-luck-app`
4. Desactiva Google Analytics (no lo necesitas)
5. Haz clic en **"Crear proyecto"**

### Paso 2: Registrar tu app web
1. En la pantalla principal, haz clic en el ícono **</>** (Web)
2. Nombre de la app: `Good Luck Web`
3. Marca ✅ "También configura Firebase Hosting"
4. Haz clic en **"Registrar app"**
5. **⚠️ COPIA el objeto `firebaseConfig`** — lo necesitarás después:
   ```js
   apiKey: "AIzaSy...",
   authDomain: "good-luck-app.firebaseapp.com",
   projectId: "good-luck-app",
   ...
   ```

### Paso 3: Activar Cloud Messaging
1. En el menú izquierdo → **Configuración del proyecto** (ícono ⚙️)
2. Pestaña **"Cloud Messaging"**
3. En "Certificados web push" → haz clic en **"Generar par de claves"**
4. **⚠️ COPIA la "Clave pública"** (VAPID Key) — la necesitarás

### Paso 4: Obtener credenciales del servidor
1. Sigue en Configuración del proyecto → pestaña **"Cuentas de servicio"**
2. Haz clic en **"Generar nueva clave privada"**
3. Se descargará un archivo `.json` — **guárdalo como `serviceAccountKey.json`**
   y ponlo en la misma carpeta que `servidor.js`

---

## PARTE 2 — Configurar los archivos (10 minutos)

### Paso 5: Actualizar firebase-messaging-sw.js
Abre el archivo y reemplaza los valores con los que copiaste:
```js
firebase.initializeApp({
  apiKey:            "← tu apiKey aquí",
  authDomain:        "← tu authDomain aquí",
  projectId:         "← tu projectId aquí",
  storageBucket:     "← tu storageBucket aquí",
  messagingSenderId: "← tu messagingSenderId aquí",
  appId:             "← tu appId aquí"
});
```

### Paso 6: Actualizar push-client.js
Igual, reemplaza `firebaseConfig` y también:
```js
const VAPID_KEY   = "← tu Clave pública (VAPID) aquí";
const BACKEND_URL = "← la URL de tu servidor (ver Parte 3)";
```

### Paso 7: Agregar push-client.js a tu app Good Luck
Al final del `<body>` de tu `goodluck-app.html`, agrega:
```html
<script type="module">
  import { iniciarNotificacionesPush } from './push-client.js';

  // Llama esto cuando el usuario entra a la app
  // Usa un ID único por usuario (puedes generar uno con crypto.randomUUID())
  const userId = localStorage.getItem('userId') || crypto.randomUUID();
  localStorage.setItem('userId', userId);

  window.addEventListener('load', () => {
    iniciarNotificacionesPush(userId);
  });

  // Función para recibir notificaciones cuando la app está abierta
  window.recibirNotificacionPush = function(notif) {
    notifications.unshift(notif);
    updateNotifCount();
    showMatchPopup(notif);
  };
</script>
```

---

## PARTE 3 — Publicar el servidor (gratis con Railway)

### Paso 8: Crear cuenta en Railway
1. Ve a https://railway.app
2. Regístrate con tu cuenta de GitHub (gratis)

### Paso 9: Subir el servidor a GitHub
1. Crea una cuenta en https://github.com si no tienes
2. Crea un repositorio nuevo llamado `goodluck-server`
3. Sube estos archivos:
   - `servidor.js`
   - `package.json`
   - `serviceAccountKey.json` ⚠️ (agrega este archivo a .gitignore si el repo es público)

### Paso 10: Desplegar en Railway
1. En Railway → **"New Project"** → **"Deploy from GitHub repo"**
2. Selecciona `goodluck-server`
3. Railway detecta automáticamente que es Node.js y lo despliega
4. Ve a **"Settings"** → **"Networking"** → **"Generate Domain"**
5. **⚠️ COPIA esa URL** (ejemplo: `https://goodluck-server.up.railway.app`)
6. Pégala en `push-client.js` como valor de `BACKEND_URL`

---

## PARTE 4 — Publicar la app (gratis con Firebase Hosting)

### Paso 11: Instalar Firebase CLI
Abre una terminal en tu computador y ejecuta:
```bash
npm install -g firebase-tools
firebase login
```

### Paso 12: Inicializar hosting
```bash
# Crea una carpeta para tu app
mkdir goodluck-app
cd goodluck-app

# Pon aquí tus archivos:
# - goodluck-app.html  (renómbralo a index.html)
# - firebase-messaging-sw.js
# - push-client.js

firebase init hosting
# Responde:
# ¿Directorio público? → . (punto)
# ¿App de una sola página? → No
# ¿Sobreescribir index.html? → No
```

### Paso 13: Publicar
```bash
firebase deploy --only hosting
```
Te dará una URL como: `https://good-luck-app.web.app` ✅

---

## PARTE 5 — Prueba final

### Paso 14: Verificar que todo funciona
1. Abre tu app en el celular: `https://good-luck-app.web.app`
2. Acepta el permiso de notificaciones cuando te lo pida
3. Publica un objeto perdido (ej: "Perro golden, El Prado")
4. Desde otro dispositivo (o pestaña) publica un objeto encontrado similar
5. En 1-2 segundos deberías recibir la notificación push 🎉

### Verificar el servidor
Visita: `https://tu-servidor.railway.app/health`
Deberías ver:
```json
{
  "estado": "activo ✅",
  "usuarios": 2,
  "publicaciones": 2
}
```

---

## 💡 Resumen de costos

| Servicio        | Plan gratuito incluye               |
|-----------------|-------------------------------------|
| Firebase FCM    | Notificaciones ilimitadas ✅         |
| Firebase Hosting| 10 GB almacenamiento, 360 MB/día ✅  |
| Railway         | $5 USD de crédito mensual (~500hs)  |
| GitHub          | Repositorios públicos ilimitados ✅  |

**Para empezar: $0 USD al mes** 🎉

---

## 🆘 Problemas comunes

**"Las notificaciones no llegan"**
→ Verifica que tu app esté en HTTPS (no funciona en http:// ni en archivos locales)
→ Verifica que el usuario aceptó el permiso

**"Error al registrar Service Worker"**
→ El archivo `firebase-messaging-sw.js` debe estar en la RAÍZ del sitio
→ No puede estar en una subcarpeta

**"Error en el servidor: Cannot find module serviceAccountKey.json"**
→ Descarga el archivo desde Firebase Console → Cuentas de servicio
→ Ponlo en la misma carpeta que servidor.js

**¿Necesitas ayuda?** Escríbeme y te ayudo paso a paso 🍀
