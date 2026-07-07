# Reporte de Práctica P2.6 — Monitor de Actividad Física (Wearable BLE &rarr; Teléfono)

> **Nota de Desarrollo:** Inicialmente se presentó un bloqueo en el establecimiento de la conexión entre el dispositivo móvil físico (**Cliente**) y el emulador Wear OS (**Servidor/Reloj**). Tras un diagnóstico profundo y la reestructuración del módulo de conectividad, se corrigió el problema de *Advertising*, logrando la sincronización exitosa y el envío de datos biométricos en tiempo real mediante el protocolo **BLE NOTIFY**.

---

## 1. Diferencia Clave entre P2.4 y P2.6

La evolución de la arquitectura de comunicación entre ambas prácticas se define por el sentido del flujo de datos y el método de sincronización de la capa GATT:

* **P2.4 (Flujo Unidireccional Cliente &rarr; Servidor):** El teléfono actuaba como el nodo central emisor de datos hacia el *wearable* a través de operaciones explícitas de escritura (`WRITE`).
* **P2.6 (Flujo Síncrono Distribuido Servidor &rarr; Cliente):** El *wearable* asume el rol de generador de telemetría dinámica (conteo de pasos, ritmo cardiaco, calorías quemadas y estado de actividad) hacia la aplicación móvil.
* **Implementación de `NOTIFY`:** Debido a que el dispositivo vestible debe transmitir datos asíncronos de forma autónoma sin esperar una solicitud activa (*polling*) del teléfono, se implementó la propiedad **`BLE NOTIFY`**. Esto permite que el cliente permanezca suscrito al canal y procese las actualizaciones del buffer de manera automática e inmediata.

---

## 2. Cambios e Ingeniería de Software Realizados

### A) Optimización del Ciclo de Vida de los Streams (Wearable)
* **Archivo:** `wearable_app/lib/sensor_simulator.dart`
* **Defecto detectado:** Al ejecutar la acción de "Detener", la lógica de la aplicación invocaba el cierre definitivo de los objetos `StreamController`. Al intentar reanudar la simulación ("Iniciar"), el framework asíncrono de Dart colapsaba arrojando la excepción: *“Cannot add new events after calling close”*.
* **Solución aplicada:** Se modificó el método `stop()` para que ejecute únicamente la cancelación de la instancia activa del `Timer`, manteniendo la persistencia y apertura de los `StreamControllers`.
* **Resultado:** Ciclo de vida corregido. El simulador de sensores puede iniciar y detener su ejecución de manera indefinida sin corromper el estado de la aplicación.

### B) Instrumentación de Logs y Diagnóstico Periférico (Kotlin)
* **Archivo:** `wearable_app/android/app/src/main/kotlin/.../BlePeripheral.kt`
* **Acción:** Se integró un sistema riguroso de trazabilidad nativa en la capa de Android (`Log.d` / `Log.e`) para monitorear el comportamiento del hardware simulado en el emulador, evaluando los siguientes puntos críticos:
  1. Apertura del servidor GATT.
  2. Disponibilidad del chip de transmisión (*Advertiser*).
  3. Estado de inicialización del *Advertising*.
  4. Conteo de nodos centrales conectados al invocar `notifySteps()`.
  5. Habilitación del Descriptor de Configuración de Características de Cliente (**CCCD**).
* **Resultado de diagnóstico:** Gracias al aislamiento por logs, se determinó que el fallo de conexión no residía en el servidor GATT, sino en la capa de transmisión de paquetes de presencia con el error de sistema: **`Advertising failed: 1`**.

### C) Reestructuración de la Estrategia de *Advertising*
* **Archivo:** `BlePeripheral.kt`
* **Solución aplicada:** Para mitigar el bloqueo por hilos o colisiones del transceptor Bluetooth, se forzó un ciclo de limpieza previa invocando `stopAdvertising()` inmediatamente antes de inicializar un nuevo proceso de broadcasting. Asimismo, se implementó un algoritmo de tolerancia a fallos por niveles (*Fallback strategy*):

| Intento | Modo de Transmisión (`AdvertiseMode`) | Inclusión de Nombre (`includeDeviceName`) |
| :--- | :--- | :--- |
| **Atenuación 1 (Base)** | `ADVERTISE_MODE_BALANCED` | `false` (Unidades de datos optimizadas) |
| **Atenuación 2 (Fallback)** | `ADVERTISE_MODE_LOW_LATENCY` | `true` (Máxima visibilidad de canal) |

* **Resultado (Validación en Logcat):**
  ```text
  [BleServer] Advertising started successfully
  [BleServer] notifySteps(...) 1 device(s) connected
  [BleServer] Notifications enabled ...

  D) Implementación del Cliente BLE y Suscripción (Teléfono)
Proyecto: telefono_app

Mapeo de arquitectura: Se diseñó un cliente reactivo encargado de ejecutar de manera secuencial los siguientes hilos de ejecución:

Escaneo selectivo filtrando por el identificador único universal del servicio (serviceUUID).

Conexión directa al nodo y ejecución de discoverServices().

Activación remota del descriptor de notificación mediante setNotifyValue(true) en cada una de las características expuestas.

Escucha persistente a través del callback onCharacteristicChanged.

Resultado: Reactividad de UI completada. Las tarjetas de la interfaz gráfica del teléfono procesan y renderizan en tiempo real los cambios del sensor.

3. Conclusión
La reingeniería aplicada sobre la práctica P2.6 resolvió satisfactoriamente las restricciones iniciales de comunicación entre plataformas, cumpliendo los objetivos técnicos planteados:

Generación y abstracción eficiente de datos biométricos en el wearable.

Canalización asíncrona robusta mediante BLE NOTIFY sin degradación de batería.

Reactividad en tiempo real de la UI móvil de cara al usuario.

Ventaja Arquitectónica Clave: Al resolver el esquema nativo de empaquetamiento de Bluetooth, el ecosistema ha alcanzado independencia de entorno. Los dispositivos mantienen una comunicación directa y descentralizada de extremo a extremo (Edge-to-Edge), prescindiendo totalmente de puentes de red locales o de la infraestructura de la estación de desarrollo.