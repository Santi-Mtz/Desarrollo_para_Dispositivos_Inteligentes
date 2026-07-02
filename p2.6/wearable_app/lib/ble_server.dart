import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

import 'ble_constants.dart';
import 'sensor_simulator.dart';

class BleServer {
  final SensorSimulator simulator;
  bool _advertising = false;

  BleServer(this.simulator);

  bool get isAdvertising => _advertising;

  // Convertir int a bytes little-endian (4 bytes)
  Uint8List _intToBytes(int value) {
    final data = ByteData(4);
    data.setInt32(0, value, Endian.little);
    return data.buffer.asUint8List();
  }

  // Convertir int a bytes (2 bytes)
  Uint8List _int16ToBytes(int value) {
    final data = ByteData(2);
    data.setInt16(0, value, Endian.little);
    return data.buffer.asUint8List();
  }

  // Iniciar advertising y GATT server
  Future<void> startAdvertising() async {
    try {
      // Verificar que BLE está encendido
      final state = await FlutterBluePlus.adapterState.first;
      if (state != BluetoothAdapterState.on) {
        throw Exception('Bluetooth desactivado. Actívalo en el emulador.');
      }

      _advertising = true;
      print('[BleServer] Iniciado. Esperando conexiones...');

      // Suscribir streams del simulador y notificar cambios
      simulator.stepsStream.listen((steps) {
        _notifyCharacteristic(BleConstants.stepsUUID, _intToBytes(steps));
      });

      simulator.heartRateStream.listen((bpm) {
        _notifyCharacteristic(
          BleConstants.heartRateUUID,
          Uint8List.fromList([bpm]),
        );
      });

      simulator.caloriesStream.listen((cal) {
        _notifyCharacteristic(BleConstants.caloriesUUID, _int16ToBytes(cal));
      });

      simulator.statusStream.listen((status) {
        _notifyCharacteristic(
          BleConstants.statusUUID,
          Uint8List.fromList(utf8.encode(status)),
        );
      });
    } catch (e) {
      _advertising = false;
      print('[BleServer] Error: $e');
      rethrow;
    }
  }

  void _notifyCharacteristic(String uuid, Uint8List data) {
    print('[BleServer] NOTIFY $uuid: $data');
  }

  void stop() {
    _advertising = false;
    simulator.stop();
  }
}

