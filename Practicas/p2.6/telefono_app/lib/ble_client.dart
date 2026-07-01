import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'ble_constants.dart';
import 'app_provider.dart';

class BleClient {
  final AppProvider provider;
  BluetoothDevice? _targetDevice;
  StreamSubscription<List<ScanResult>>? _scanSub;
  final List<StreamSubscription<dynamic>> _characteristicSubs = [];
  bool _connecting = false;

  BleClient(this.provider);

  Future<bool> _ensurePermissions() async {
    final statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ].request();

    final denied = statuses.entries.where((entry) => !entry.value.isGranted);
    if (denied.isNotEmpty) {
      provider.updateData(newStatus: 'Permisos BLE denegados');
      return false;
    }

    return true;
  }

  void _clearCharacteristicSubscriptions() {
    for (final subscription in _characteristicSubs) {
      subscription.cancel();
    }
    _characteristicSubs.clear();
  }

  BluetoothCharacteristic? _findCharacteristic(
    BluetoothService service,
    String uuid,
  ) {
    for (final characteristic in service.characteristics) {
      if (characteristic.uuid.toString() == uuid) {
        return characteristic;
      }
    }
    return null;
  }

  Future<void> _watchCharacteristic(
    BluetoothCharacteristic characteristic,
    void Function(List<int> value) onValue,
  ) async {
    await characteristic.setNotifyValue(true);
    final subscription = characteristic.onValueReceived.listen(onValue);
    _characteristicSubs.add(subscription);
    onValue(await characteristic.read());
  }

  int _decodeInt32(List<int> value) {
    final bytes = Uint8List.fromList(value);
    return ByteData.sublistView(bytes).getInt32(0, Endian.little);
  }

  int _decodeInt16(List<int> value) {
    final bytes = Uint8List.fromList(value);
    return ByteData.sublistView(bytes).getInt16(0, Endian.little);
  }

  Future<void> _connectToDevice(BluetoothDevice device) async {
    if (_connecting) {
      return;
    }

    _connecting = true;
    try {
      await device.connect(timeout: const Duration(seconds: 15));
      provider.updateData(newStatus: 'Descubriendo servicios...');

      final services = await device.discoverServices();
      BluetoothService? targetService;
      for (final service in services) {
        if (service.uuid.toString() == BleConstants.serviceUUID) {
          targetService = service;
          break;
        }
      }

      if (targetService == null) {
        throw Exception('Servicio BLE no encontrado');
      }

      _clearCharacteristicSubscriptions();

      final stepsCharacteristic =
          _findCharacteristic(targetService, BleConstants.stepsUUID);
      final heartRateCharacteristic =
          _findCharacteristic(targetService, BleConstants.heartRateUUID);
      final caloriesCharacteristic =
          _findCharacteristic(targetService, BleConstants.caloriesUUID);
      final statusCharacteristic =
          _findCharacteristic(targetService, BleConstants.statusUUID);

      if (stepsCharacteristic != null) {
        await _watchCharacteristic(stepsCharacteristic, (value) {
          if (value.length >= 4) {
            provider.updateData(newSteps: _decodeInt32(value));
          }
        });
      }

      if (heartRateCharacteristic != null) {
        await _watchCharacteristic(heartRateCharacteristic, (value) {
          if (value.isNotEmpty) {
            provider.updateData(newHeartRate: value.first);
          }
        });
      }

      if (caloriesCharacteristic != null) {
        await _watchCharacteristic(caloriesCharacteristic, (value) {
          if (value.length >= 2) {
            provider.updateData(newCalories: _decodeInt16(value));
          }
        });
      }

      if (statusCharacteristic != null) {
        await _watchCharacteristic(statusCharacteristic, (value) {
          provider.updateData(
            newStatus: utf8.decode(value, allowMalformed: true),
          );
        });
      }

      _targetDevice = device;
      provider.setConnected(true);
      provider.updateData(newStatus: 'Conectado');
    } catch (e) {
      await device.disconnect();
      provider.setConnected(false);
      provider.updateData(newStatus: 'Error de conexión');
    } finally {
      _connecting = false;
    }
  }

  // Iniciar el escaneo
  Future<void> startScan() async {
    if (FlutterBluePlus.isScanningNow || _connecting) {
      print('[BleClient] Ya hay un escaneo en curso.');
      return;
    }

    try {
      final hasPermissions = await _ensurePermissions();
      if (!hasPermissions) {
        return;
      }

      final state = await FlutterBluePlus.adapterState.first;
      if (state != BluetoothAdapterState.on) {
        provider.updateData(newStatus: 'Bluetooth apagado');
        return;
      }

      await _scanSub?.cancel();
      _scanSub = FlutterBluePlus.scanResults.listen((results) {
        if (_targetDevice != null || _connecting || results.isEmpty) {
          return;
        }

        final selectedDevice = results.first.device;
        _connectToDevice(selectedDevice);
      }, onError: (error) {
        provider.updateData(newStatus: 'Error en escaneo');
      });

      provider.updateData(newStatus: 'Buscando wearable...');

      await FlutterBluePlus.startScan(
        withServices: [Guid(BleConstants.serviceUUID)],
        timeout: const Duration(seconds: 15),
      );
    } catch (e) {
      provider.updateData(newStatus: 'Error al escanear');
    }
  }

  // Método que faltaba: Desconexión
  Future<void> disconnect() async {
    await FlutterBluePlus.stopScan();
    await _scanSub?.cancel();
    _scanSub = null;
    _clearCharacteristicSubscriptions();

    await _targetDevice?.disconnect();
    provider.setConnected(false);
    _targetDevice = null;
  }
}