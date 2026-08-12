# Wiki Elden Ring - Evaluación 2: Ecosistema Completo

Este proyecto integra un ecosistema interactivo de tres dispositivos (Wearable, Teléfono/Tablet y Smart TV PWA) sincronizados en tiempo real y conectados a un servidor backend central para el caso de estudio de la Wiki de Elden Ring.

## Características del Ecosistema (Evaluación 2)

### 1. Aplicación Wearable (Wear OS - wearable_app)
- Funciona como servidor GATT periférico Bluetooth Low Energy (BLE).
- Simula y transmite datos en tiempo real cada segundo:
  - Tiempo de juego acumulado (simulado: 1 segundo real equivale a 10 minutos de juego).
  - Pasos del jugador.
  - Ritmo cardíaco (pulsaciones por minuto).
- Cuenta con un botón de Iniciar/Detener para controlar la simulación.
- Emite alertas físicas mediante dos vibraciones continuas cuando el tiempo de juego acumulado alcanza las 2 horas (120 minutos).

### 2. Aplicación Móvil (Android - telefono_app)
- Actúa como cliente central BLE. Escanea, se conecta y se suscribe por notificaciones (GATT NOTIFY) al wearable.
- Recibe y decodifica el payload de bytes de las métricas (pasos, ritmo y tiempo de juego).
- Muestra la telemetría en tiempo real y gestiona el estado de la conexión BLE.
- Despliega una Alerta de Descanso en pantalla y genera vibraciones físicas cuando detecta que el jugador ha superado las 2 horas de juego acumuladas.
- Envía eventos HTTP POST de sincronización hacia el backend cuando el usuario selecciona un arma en el catálogo para actualizar la Smart TV.
- Cuenta con un panel interactivo para configurar dinámicamente la dirección IP del servidor.
- Maneja excepciones de red mediante reintentos automáticos y timeouts sin crasheos.

### 3. PWA para Smart TV (tv_page)
- Alojada en producción en la plataforma Vercel: `https://wikieldenring.vercel.app/tv`
- Aplicación web progresiva optimizada para una resolución fija de 1920x1080 (Safe Zone del 5% sin barras de desplazamiento).
- Diseñada y adaptada a la interacción de 10 pies (10-foot UI) con fuentes de gran tamaño (desde 24px hasta 80px) visibles a distancia.
- Control total por control remoto mapeado a las flechas del teclado (ArrowUp, ArrowDown, ArrowLeft, ArrowRight) y teclas Enter, Backspace o Escape.
- Grid de 2x2 con el catálogo de armas de Elden Ring. Al seleccionar un elemento con Enter, se muestra el lore, características clave y una imagen de fondo en alta definición.
- Navegación espacial D-pad sin rotura de límites de foco y con un resplandor dorado flotante en el elemento activo.
- Recibe actualizaciones en tiempo real desde el servidor a través de Server-Sent Events (SSE) en menos de 1 segundo para sincronizarse con la tablet.
- Soporte offline mediante Service Worker y caché estática local.

### 4. Servidor Backend (backend)
- Alojado en producción en la plataforma Render: `https://aegis-wiki-backend.onrender.com`
- API construida con Node.js y Express conectada a una base de datos PostgreSQL de producción.
- Expone el catálogo de armas en el endpoint /api/armas.
- Gestiona el canal de Server-Sent Events (SSE) a través de /sync/stream y /sync/publish para la comunicación en tiempo real entre el teléfono y la Smart TV.

---

## Instrucciones de Instalación y Ejecución

### Requisitos Previos
- Node.js versión 24.13.0 o superior.
- Flutter SDK versión 3.44.x o superior.
- Dispositivos físicos: un reloj inteligente con Wear OS (o emisor BLE secundario) y una tablet/teléfono Android, conectados a la misma red local Wi-Fi que la computadora de pruebas.

### Paso 1: Servidor Backend
1. Navegar a la carpeta backend:
   cd backend
2. Instalar dependencias:
   npm install
3. Configurar las variables de entorno en el archivo .env con la URL de la base de datos PostgreSQL.
4. Iniciar el servidor local:
   npm start

### Paso 2: Smart TV PWA
1. Navegar a la carpeta tv_page:
   cd tv_page
2. Instalar dependencias e iniciar el servidor Angular:
   npm install
   npm start
3. Abrir la URL en el navegador: http://localhost:4200/tv. Emular una resolución fija de 1920x1080 utilizando las herramientas de desarrollo de Chrome.

### Paso 3: Aplicación Móvil (telefono_app)
1. Conectar el dispositivo móvil Android a la computadora.
2. Navegar a la carpeta telefono_app:
   cd telefono_app
3. Instalar dependencias de Flutter y compilar en el dispositivo:
   flutter pub get
   flutter run
4. En el panel de configuración de la pantalla principal, escribir la IP local de la computadora (ejemplo: http://192.168.1.15:3000) para conectar la app al backend local.

### Paso 4: Aplicación Wearable (wearable_app)
1. Conectar el wearable o el segundo emisor BLE por ADB inalámbrico.
2. Navegar a la carpeta wearable_app:
   cd wearable_app
3. Instalar dependencias y ejecutar:
   flutter pub get
   flutter run

---

**Alumno:** Santiago Alberto Martínez Hernández (Grupo: IDGS16)
**Materia:** Desarrollo para Dispositivos Inteligentes - Evaluación 2 (Ecosistema Completo)

Se utilizó inteligencia artificial para la corrección de errores de dicción y estructura.

---

## Mapeo de Criterios de Evaluación (Rúbrica Nivel SA)

Para facilitar la revisión rápida de la rúbrica por parte del docente, a continuación se detalla la ubicación exacta de cada criterio evaluado en este repositorio:

| Criterio Rúbrica | Descripción del Requisito | Ubicación en el Repositorio |
| :--- | :--- | :--- |
| **SA.0.B** | APK firmado e instalable | Código en [telefono_app/](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/telefono_app) y firmado en `telefono_app/android/app/build.gradle` |
| **SA.1.A** | App Wearable (Datos e Ícono) | Lógica BLE en [wearable_app/main.dart](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/wearable_app/main.dart) e ícono en `wearable_app/android/app/src/main/res/` |
| **SA.1.B** | Teléfono recibe datos BLE | Lógica en [telefono_app/main.dart](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/telefono_app/main.dart) (suscripción GATT BLE NOTIFY sin polling) |
| **SA.2.A** | Estructura PWA | Registrado en [pwa/index.html](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/pwa/index.html) con `manifest.json` y `service-worker.js` |
| **SA.2.B** | Layout 10-foot | Interfaz en [tv_page/tv.page.ts](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/tv_page/tv.page.ts) (resolución `1920x1080` y safe-zone 5%) |
| **SA.2.C** | Navegación y datos reales | Manejo de D-pad en [tv_page/tv.page.ts](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/tv_page/tv.page.ts) y consumo de datos reales desde `/api/armas` |
| **SA.3** | Ecosistema 3 dispositivos | Integración simultánea entre [wearable_app/](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/wearable_app), [telefono_app/](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/telefono_app) y [tv_page/](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/tv_page/tv.page.ts) a través del `backend` |
| **SA.4** | Documentación de seguridad | Documentado en el reporte [E2.4_Documentacion_Seguridad.md](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/E2.4_Documentacion_Seguridad.md) |
| **SA.5** | Plan de pruebas | Documentado en el reporte [E2.2_Plan_y_Reporte_de_Pruebas.md](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/E2.2_Plan_y_Reporte_de_Pruebas.md) (Sección 3 y 5) |
| **SA.6.A** | Configuración de herramientas | Documentado en el reporte [E2.2_Plan_y_Reporte_de_Pruebas.md](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/E2.2_Plan_y_Reporte_de_Pruebas.md) (Sección 1) |
| **SA.6.B** | Emuladores / Dispositivos físicos | Documentado en el reporte [E2.2_Plan_y_Reporte_de_Pruebas.md](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/E2.2_Plan_y_Reporte_de_Pruebas.md) (Sección 2) |
| **Crítico** | Exclusión de archivos sensibles | Configurado en el archivo [.gitignore](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/.gitignore) de la carpeta |
| **Demo** | Guía de uso simultáneo | Explicado en la Sección 4 de [E2.1_Manual_Usuario.md](file:///c:/Users/pokes/Documents/GitHub/Desarrollo_para_Dispositivos_Inteligentes/Evaluacion_ll/E2.1_Manual_Usuario.md) |