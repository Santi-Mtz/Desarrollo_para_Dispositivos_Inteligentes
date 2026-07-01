import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:ble_peripheral_plus/ble_peripheral_plus.dart';
import 'package:permission_handler/permission_handler.dart';

import 'ble_constants.dart';
import 'sensor_simulator.dart';

class BleServer {
  final SensorSimulator simulator;
  bool _advertising = false;
  bool _initialized = false;
  bool _serviceAdded = false;
  final List<StreamSubscription<dynamic>> _subscriptions = [];

  BleServer(this.simulator);

  bool get isAdvertising => _advertising;

  Uint8List _intToBytes(int value) {
    final data = ByteData(4);
    data.setInt32(0, value, Endian.little);
    return data.buffer.asUint8List();
  }

  Uint8List _int16ToBytes(int value) {
    final data = ByteData(2);
    data.setInt16(0, value, Endian.little);
    return data.buffer.asUint8List();
  }

  Future<void> _ensurePermissions() async {
    final statuses = await [
      Permission.bluetoothAdvertise,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ].request();

    final denied = statuses.entries.where((entry) => !entry.value.isGranted);
    if (denied.isNotEmpty) {
      throw Exception('Permisos BLE no concedidos');
    }
  }

  Future<void> _initializePeripheral() async {
    if (_initialized) {
      return;
    }

    await BlePeripheral.initialize();
    BlePeripheral.setAdvertisingStatusUpdateCallback((advertising, error) {
      _advertising = advertising;
      if (error != null && error.isNotEmpty) {
        print('[BleServer] Advertising error: $error');
      }
    });
    _initialized = true;
  }

  Future<void> _registerGattService() async {
    final service = BleService(
      uuid: BleConstants.serviceUUID,
      primary: true,
      characteristics: [
        BleCharacteristic(
          uuid: BleConstants.stepsUUID,
          properties: [
            CharacteristicProperties.read.index,
            CharacteristicProperties.notify.index,
          ],
          permissions: [AttributePermissions.readable.index],
          value: _intToBytes(simulator.steps),
        ),
        BleCharacteristic(
          uuid: BleConstants.heartRateUUID,
          properties: [
            CharacteristicProperties.read.index,
            CharacteristicProperties.notify.index,
          ],
          permissions: [AttributePermissions.readable.index],
          value: Uint8List.fromList([simulator.heartRate]),
        ),
        BleCharacteristic(
          uuid: BleConstants.caloriesUUID,
          properties: [
            CharacteristicProperties.read.index,
            CharacteristicProperties.notify.index,
          ],
          permissions: [AttributePermissions.readable.index],
          value: _int16ToBytes(simulator.calories),
        ),
        BleCharacteristic(
          uuid: BleConstants.statusUUID,
          properties: [
            CharacteristicProperties.read.index,
            CharacteristicProperties.notify.index,
          ],
          permissions: [AttributePermissions.readable.index],
          value: Uint8List.fromList(utf8.encode(simulator.status)),
        ),
      ],
    );

    await BlePeripheral.addService(service);
  }

  void _attachSimulatorStreams() {
    if (_subscriptions.isNotEmpty) {
      return;
    }

    _subscriptions.add(
      simulator.stepsStream.listen((steps) {
        if (!_advertising) return;
        _notifyCharacteristic(BleConstants.stepsUUID, _intToBytes(steps));
      }),
    );

    _subscriptions.add(
      simulator.heartRateStream.listen((bpm) {
        if (!_advertising) return;
        _notifyCharacteristic(
          BleConstants.heartRateUUID,
          Uint8List.fromList([bpm]),
        );
      }),
    );

    _subscriptions.add(
      simulator.caloriesStream.listen((cal) {
        if (!_advertising) return;
        _notifyCharacteristic(BleConstants.caloriesUUID, _int16ToBytes(cal));
      }),
    );

    _subscriptions.add(
      simulator.statusStream.listen((status) {
        if (!_advertising) return;
        _notifyCharacteristic(
          BleConstants.statusUUID,
          Uint8List.fromList(utf8.encode(status)),
        );
      }),
    );
  }

  Future<void> startAdvertising() async {
    try {
      await _ensurePermissions();
      await _initializePeripheral();

      final supported = await BlePeripheral.isSupported();
      if (!supported) {
        throw Exception('BLE peripheral no soportado en este dispositivo');
      }

      if (!_serviceAdded) {
        await _registerGattService();
        _serviceAdded = true;
      }

      await BlePeripheral.startAdvertising(
        services: [BleConstants.serviceUUID],
        localName: 'Wearable',
        requireBonding: false,
      );

      _advertising = true;
      print('[BleServer] Iniciado. Esperando conexiones...');
      _attachSimulatorStreams();
    } catch (e) {
      _advertising = false;
      print('[BleServer] Error: $e');
      rethrow;
    }
  }

  Future<void> _notifyCharacteristic(String uuid, Uint8List data) async {
    try {
      await BlePeripheral.updateCharacteristic(
        characteristicId: uuid,
        value: data,
      );
      print('[BleServer] NOTIFY $uuid: $data');
    } catch (e) {
      print('[BleServer] Error notificando $uuid: $e');
    }
  }

  Future<void> stop() async {
    _advertising = false;
    await BlePeripheral.stopAdvertising();
    simulator.stop();
  }

  Future<void> dispose() async {
    _advertising = false;
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _subscriptions.clear();
    await BlePeripheral.stopAdvertising();
    await BlePeripheral.clearServices();
    simulator.dispose();
  }
}