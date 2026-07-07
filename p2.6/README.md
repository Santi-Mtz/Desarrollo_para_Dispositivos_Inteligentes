Reporte P2.6 — Monitor de Actividad Física (Wearable BLE → Teléfono)

Nota: En un inicio no se logró establecer conexión entre el teléfono físico (cliente) y el emulador Wear OS (reloj inteligente), por lo que se continuó trabajando hasta corregir el problema y lograr el envío de datos con BLE NOTIFY.

1) Diferencia clave entre P2.4 y P2.6
P2.4: el teléfono enviaba datos al wearable (WRITE).
P2.6: ahora el wearable genera datos (pasos, ritmo cardiaco, calorías y estado) y los manda al teléfono usando BLE.
Como el wearable “envía solo” sin que el teléfono pida, se necesitó que la comunicación fuera con BLE NOTIFY (para que el teléfono reciba automáticamente).

2) Cambios realizados para que la práctica funcione
A) Wearable: fix del ciclo “Iniciar/Detener” (streams)
Archivo: wearable_app/lib/sensor_simulator.dart

Antes, al presionar Detener, se cerraban los StreamController.
Eso provocaba que al volver a presionar Iniciar la app fallara con errores como:
“Cannot add new events after calling close”.
Se corrigió para que stop() solo cancele el Timer, pero no cierre los StreamControllers.
Resultado: el wearable puede iniciar/detener sin romper la simulación.

B) Wearable (BLE Kotlin): logs y verificación de periférico
Archivo: wearable_app/android/.../BlePeripheral.kt

Se agregaron logs para comprobar:

Si el GATT server se abre correctamente.
Si el dispositivo tiene advertiser disponible.
Si el advertising arranca o falla.
Cuántos dispositivos están conectados cuando se envía notifySteps.
Si las notificaciones se habilitan con CCCD.
Resultado: se detectó que el problema real era el advertising (con error Advertising failed: 1), no el GATT.

C) Wearable: corrección del advertising para que el teléfono lo encuentre
Archivo: BlePeripheral.kt

Para resolver el fallo del advertising:

Se hizo stopAdvertising() antes de volver a iniciar (para evitar bloqueos).
Se intentó una estrategia más compatible:
Attempt1: ADVERTISE_MODE_BALANCED, sin nombre (includeDeviceName=false)
Si fallaba, se aplicaba un fallback:
Attempt2: ADVERTISE_MODE_LOW_LATENCY, con nombre (includeDeviceName=true)
Resultado (según Logcat):

Advertising started successfully
notifySteps(...) 1 device(s) connected
Notifications enabled ...
Con esto, el teléfono logró descubrir, conectarse y recibir NOTIFY.

D) Teléfono: cliente BLE que se suscribe a NOTIFY
Proyecto: telefono_app

El cliente escanea, se conecta al wearable por el serviceUUID,
hace discoverServices,
y activa setNotifyValue(true) en cada característica.
Después, recibe datos con onCharacteristicChanged y actualiza la UI.
Resultado: las tarjetas del teléfono se actualizan con pasos, bpm, calorías y estado.

3) Conclusión
Con los cambios anteriores, la práctica P2.6 quedó funcional con el objetivo principal:

El wearable genera datos.
El wearable los envía al teléfono mediante BLE NOTIFY.
El teléfono los recibe y los muestra en tiempo real.
Además, el sistema ya no depende de estar conectados a la laptop: la comunicación es directa entre los dispositivos.