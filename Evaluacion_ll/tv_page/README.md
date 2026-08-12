# Frontend - AEGIS Wiki Elden Ring

Aplicación Angular 21 con autenticación WebAuthn biométrica, gestión de perfiles y contenido interactivo sobre Elden Ring.

## Configuración Rápida

### Instalación
```bash
npm install
```

### Servidor de Desarrollo
```bash
npm start
# O: ng serve --open
```

La aplicación estará disponible en `http://localhost:4200/`

### Build para Producción
```bash
npm run build
```

Los artefactos se almacenarán en el directorio `dist/`.

## Estructura del Proyecto

```
src/
├── app/
│   ├── app.ts                  # Componente principal (layout, navegación)
│   ├── app.html                # Template principal
│   ├── app.css                 # Estilos globales
│   ├── app.routes.ts           # Definición de rutas
│   ├── app.config.ts           # Configuración de Angular
│   ├── pages/                  # Componentes de página
│   │   ├── login.page.ts       # Autenticación + WebAuthn
│   │   ├── vista-usuario.page.ts      # Perfil de usuario
│   │   ├── vista-admin.page.ts        # Perfil de administrador
│   │   ├── mapa.page.ts               # Mapas interactivos
│   │   ├── armas.page.ts
│   │   ├── armaduras.page.ts
│   │   ├── hechizos.page.ts
│   │   ├── milagros.page.ts
│   │   ├── talismanes.page.ts
│   │   ├── builds.page.ts
│   │   ├── personajes.page.ts
│   │   ├── servicios.page.ts
│   │   ├── quienes-somos.page.ts
│   │   ├── contacto.page.ts
│   │   └── terminos-uso.page.ts
│   ├── services/
│   │   ├── auth.service.ts     # Autenticación, JWT, WebAuthn
│   │   └── api.service.ts      # Llamadas a API
│   ├── guards/
│   │   ├── auth.guard.ts       # Proteger rutas autenticadas
│   │   ├── admin.guard.ts      # Proteger rutas de admin
│   │   └── user.guard.ts       # Proteger rutas de usuario
│   └── assets/
│       └── Logo/               # Recursos gráficos
├── index.html
├── main.ts                     # Bootstrap de la app
└── styles.css                  # Estilos globales
```

## Características Principales

### 🔐 Autenticación WebAuthn
- Login con contraseña + autenticación biométrica 2FA
- Enrolado de huella digital desde el perfil del usuario
- Soporte para Windows Hello, Touch ID, lectores de huellas
- Gestión segura con @simplewebauthn/browser v11.0.0

### 👤 Perfiles de Usuario
- **"Mi Perfil"**: Visualiza información personal y gestiona biometría
- Información: nombre, email, rol, estado de cuenta
- Administración de credenciales biométricas

### 🗺️ Mapas Interactivos
- Embebidos MapGenie para:
  - The Lands Between
  - The Shadow Realm

### 📱 Navegación Responsive
- Sidebar adaptable con menú dinámico
- Sesión de usuario visible en sidebar
- Navegación optimizada (sin scrollbars innecesarios)
- Menú lógico: Inicio, Mi Perfil (si autenticado), Login/Registro (si no), páginas informativas

## Dependencias Clave

```json
{
  "dependencies": {
    "@angular/common": "~21.1.0",
    "@angular/core": "~21.1.0",
    "@angular/forms": "~21.1.0",
    "@angular/router": "~21.1.0",
    "primeng": "~21.0.0",
    "primeicons": "^7.0.0",
    "@simplewebauthn/browser": "^11.0.0",
    "rxjs": "^7.8.0",
    "tslib": "^2.3.0"
  }
}
```

## Compilación y Testing

### Tests Unitarios
```bash
ng test
```

### Tests E2E
```bash
ng e2e
```

### Linting
```bash
ng lint
```

## Gestión de Estado

La aplicación usa **señales de Angular** (Signals) para estado reactivo:
- `currentUserSignal` - Usuario autenticado actual
- `isAuthenticated` - Computed: si está autenticado
- `isAdmin` - Computed: si tiene rol administrador
- `biometricstatusSignal` - Estado de biometría del usuario

## Autenticación en Detalle

### Flujo de Login
1. Usuario ingresa email y contraseña
2. Servidor valida credenciales → retorna token JWT
3. Si no tiene biometría registrada, se propone enrolado
4. Si tiene biometría, se requiere verificación biométrica
5. Usuario completa desafío biométrico
6. Sesión se persiste en localStorage

### Flujo de Enrolado de Biometría (desde Perfil)
1. Usuario navega a "Mi Perfil"
2. Hace clic en "Configurar huella digital"
3. Sistema solicita challenge al backend via `/auth/biometric/enroll/start`
4. WebAuthn prompt aparece (biometrría de plataforma)
5. Usuario autentica con huella/cara/etc
6. Credencial se verifica y se registra en BD
7. UI actualiza para mostrar "Huella registrada"

## Estilos y Temas

Tema oscuro profesional:
- **Fondo**: #0F1115
- **Superficie**: #1A1E24
- **Texto principal**: #E6E6E6
- **Acento dorado**: #C9A227
- **Acento azul**: #7db4ff
- **Bordes**: #2A2F38

Componentes de PrimeNG adaptados al tema personalizado.

## Variables de Entorno

Por defecto la aplicación conecta a:
- **Backend API**: `http://localhost:3000`
- **Servidor Dev**: `http://localhost:4200`

Si necesitas cambiar endpoints, edita las URLs en `auth.service.ts` y `api.service.ts`.

## Notas de Desarrollo

- **Angular CLI**: v21.1.2
- **Node**: 24.13.0+
- **TypeScript**: 5.x
- **Standalone Components**: La app usa standalone components (sin módulos NgModules)
- **Routing**: Con lazy loading en rutas principales

## Troubleshooting

### WebAuthn no funciona
- Verifica que estés en localhost o HTTPS
- Comprueba que tu navegador soporta WebAuthn (Chrome 67+, Firefox 60+, Safari 13+)
- Asegúrate de tener un autenticador disponible (Windows Hello, Touch ID, etc.)

### Problemas de CORS
- Verifica que el backend en puerto 3000 esté corriendo
- Comprueba la configuración de CORS en `mi-servidor/index.js`

### Build falla
- Ejecuta `npm install` para actualizar dependencias
- Limpia `node_modules` y `dist/` con `rm -r node_modules dist`
- Reinicia el servidor de desarrollo

## Recursos Adicionales

- [Documentación Angular CLI](https://angular.dev/tools/cli)
- [PrimeNG Documentation](https://primeng.org/)
- [WebAuthn/FIDO2 Spec](https://www.w3.org/TR/webauthn-2/)
- [@simplewebauthn Docs](https://simplewebauthn.dev/)
