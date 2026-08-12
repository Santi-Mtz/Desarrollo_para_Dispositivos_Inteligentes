import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:ble_peripheral/ble_peripheral.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/services.dart';

// UUIDs constantes compartidas para BLE
const String serviceUuid = "19b10000-e8f2-537e-4f6c-d104768a1214";
const String runesCharUuid = "19b10001-e8f2-537e-4f6c-d104768a1214";
const String hrCharUuid = "19b10002-e8f2-537e-4f6c-d104768a1214";
const String stepsCharUuid = "19b10003-e8f2-537e-4f6c-d104768a1214";

void main() {
  runApp(const AegisWearableApp());
}

class AegisWearableApp extends StatelessWidget {
  const AegisWearableApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AEGIS Wearable',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        primaryColor: const Color(0xFFC6A15B), // Oro Erdtree
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFC6A15B),
          background: Colors.black,
        ),
        useMaterial3: true,
      ),
      home: const WearableDashboard(),
    );
  }
}

class WearableDashboard extends StatefulWidget {
  const WearableDashboard({super.key});

  @override
  State<WearableDashboard> createState() => _WearableDashboardState();
}

class _WearableDashboardState extends State<WearableDashboard> {
  bool _isGenerating = false;
  bool _isAdvertising = false;

  int _playTimeMinutes = 0;
  int _heartRate = 70;
  int _steps = 0;

  Timer? _sensorTimer;

  @override
  void initState() {
    super.initState();
    _initAdvertising();
  }

  @override
  void dispose() {
    _sensorTimer?.cancel();
    BlePeripheral.stopAdvertising();
    super.dispose();
  }

  Future<void> _initAdvertising() async {
    try {
      // Solicitar permisos en tiempo de ejecución para Android 12+
      await [
        Permission.bluetoothAdvertise,
        Permission.bluetoothConnect,
        Permission.bluetoothScan,
      ].request();

      await BlePeripheral.initialize();
      await BlePeripheral.clearServices();
      
      await BlePeripheral.addService(
        BleService(
          uuid: serviceUuid,
          primary: true,
          characteristics: [
            BleCharacteristic(
              uuid: runesCharUuid,
              properties: [
                CharacteristicProperties.read.index,
                CharacteristicProperties.notify.index,
              ],
              permissions: [
                AttributePermissions.readable.index,
              ],
            ),
            BleCharacteristic(
              uuid: hrCharUuid,
              properties: [
                CharacteristicProperties.read.index,
                CharacteristicProperties.notify.index,
              ],
              permissions: [
                AttributePermissions.readable.index,
              ],
            ),
            BleCharacteristic(
              uuid: stepsCharUuid,
              properties: [
                CharacteristicProperties.read.index,
                CharacteristicProperties.notify.index,
              ],
              permissions: [
                AttributePermissions.readable.index,
              ],
            ),
          ],
        ),
      );

      await BlePeripheral.startAdvertising(
        services: [serviceUuid],
        localName: 'AEGIS',
      );
      
      setState(() {
        _isAdvertising = true;
      });
    } catch (e) {
      debugPrint('Error al iniciar publicidad BLE en Wear OS: $e');
    }
  }

  Future<void> _stopAdvertising() async {
    try {
      if (_isGenerating) {
        _toggleGenerator();
      }
      await BlePeripheral.stopAdvertising();
      setState(() {
        _isAdvertising = false;
        _playTimeMinutes = 0;
        _heartRate = 70;
        _steps = 0;
      });
    } catch (e) {
      debugPrint('Error al detener publicidad BLE: $e');
    }
  }

  String _formatPlayTime(int minutes) {
    final int hours = minutes ~/ 60;
    final int mins = minutes % 60;
    return '${hours}h ${mins}m';
  }

  void _toggleGenerator() {
    setState(() {
      _isGenerating = !_isGenerating;
    });

    if (_isGenerating) {
      _sensorTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        setState(() {
          _steps += (1 + (timer.tick % 2));
          _heartRate = 72 + (timer.tick % 50);
          _playTimeMinutes += 10; // 10 minutos simulados por segundo real
        });

        _notifyData(runesCharUuid, _playTimeMinutes);
        _notifyData(hrCharUuid, _heartRate);
        _notifyData(stepsCharUuid, _steps);

        // Alerta de descanso: 120 minutos (2 horas) o superior
        if (_playTimeMinutes >= 120 && _playTimeMinutes % 30 == 0) {
          HapticFeedback.vibrate();
          Future.delayed(const Duration(milliseconds: 300), () => HapticFeedback.vibrate());

          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('¡ALERTA DE DESCANSO! Has superado las 2h de juego.'),
                backgroundColor: Colors.red,
                duration: Duration(seconds: 2),
              ),
            );
          }
        }
      });
    } else {
      _sensorTimer?.cancel();
      _sensorTimer = null;
    }
  }

  void _resetPlayTime() {
    setState(() {
      _playTimeMinutes = 0;
    });
    _notifyData(runesCharUuid, 0);
  }

  void _notifyData(String charUuid, int value) {
    final bytes = _intToBytes(value);
    BlePeripheral.updateCharacteristic(
      characteristicId: charUuid,
      value: bytes,
    );
  }

  Uint8List _intToBytes(int value) {
    final buffer = ByteData(4);
    buffer.setInt32(0, value, Endian.little);
    return buffer.buffer.asUint8List();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _isAdvertising ? Colors.green : Colors.grey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _isAdvertising ? 'BLE PUBLICANDO' : 'BLE APAGADO',
                      style: const TextStyle(fontSize: 10, color: Colors.grey, letterSpacing: 1),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                const Text(
                  'Métricas Sinluz',
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFC6A15B),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Tiempo de Juego: ${_formatPlayTime(_playTimeMinutes)}',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Pulso: $_heartRate lpm',
                  style: TextStyle(
                    fontSize: 14,
                    color: _heartRate > 120 ? Colors.redAccent : Colors.white70,
                  ),
                ),
                Text(
                  'Pasos: $_steps',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 12),

                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: ElevatedButton.icon(
                    onPressed: _toggleGenerator,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isGenerating ? const Color(0xFF9A2A2A) : const Color(0xFFC6A15B),
                      foregroundColor: _isGenerating ? Colors.white : Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    icon: Icon(_isGenerating ? Icons.pause : Icons.play_arrow, size: 16),
                    label: Text(
                      _isGenerating ? 'PAUSAR SENSORES' : 'INICIAR SENSORES',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 6),

                if (_isGenerating)
                  SizedBox(
                    width: double.infinity,
                    height: 38,
                    child: TextButton.icon(
                      onPressed: _resetPlayTime,
                      icon: const Icon(Icons.refresh, size: 14, color: Colors.grey),
                      label: const Text(
                        'REINICIAR TIEMPO',
                        style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                const SizedBox(height: 6),
                SizedBox(
                  width: double.infinity,
                  height: 40,
                  child: ElevatedButton.icon(
                    onPressed: _isAdvertising ? _stopAdvertising : _initAdvertising,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _isAdvertising ? const Color(0xFF801A1A) : const Color(0xFFC6A15B),
                      foregroundColor: _isAdvertising ? Colors.white : Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    icon: Icon(_isAdvertising ? Icons.bluetooth_disabled : Icons.bluetooth, size: 14),
                    label: Text(
                      _isAdvertising ? 'DETENER EMISIÓN' : 'EMITIR BLE',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
