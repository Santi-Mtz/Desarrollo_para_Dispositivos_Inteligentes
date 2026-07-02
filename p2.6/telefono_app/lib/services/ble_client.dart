import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../ble_constants.dart';
import '../models/activity_data.dart';

class BleClient {
  BluetoothDevice? _device;
  final List<StreamSubscription> _subs = [];

  // Stream de datos de actividad
  final _dataCtrl = StreamController<ActivityData>.broadcast();
  Stream<ActivityData> get dataStream => _dataCtrl.stream;

  bool _connected = false;
  bool get isConnected => _connected;

  // Estado acumulado
  ActivityData _current = ActivityData(
    steps: 0,
    heartRate: 0,
    calories: 0,
    status: 'sin datos',
    timestamp: DateTime.now(),
  );

  // Escanear y conectar al primer wearable con el serviceUUID correcto
  Future<void> scanAndConnect() async {
    print('[BleClient] Iniciando escaneo...');

    final completer = Completer<BluetoothDevice>();
    final scanSub = FlutterBluePlus.scanResults.listen((results) {
      for (final r in results) {
        final advertisedUUIDs = r.advertisementData.serviceUuids
            .map((u) => u.toString().toLowerCase());
        if (advertisedUUIDs
            .contains(BleConstants.serviceUUID.toLowerCase())) {
          if (!completer.isCompleted) {
            completer.complete(r.device);
          }
        }
      }
    });

    await FlutterBluePlus.startScan(
      timeout: const Duration(seconds: 15),
    );

    try {
      _device = await completer.future.timeout(
        const Duration(seconds: 16),
        onTimeout: () =>
            throw Exception('Wearable no encontrado en 15 segundos'),
      );
    } finally {
      await FlutterBluePlus.stopScan();
      scanSub.cancel();
    }

    await _connect();
  }

  Future<void> _connect() async {
    await _device!.connect();
    _connected = true;
    print('[BleClient] Conectado a ${_device!.platformName}');

    // Detectar desconexion
    _device!.connectionState.listen((state) {
      if (state == BluetoothConnectionState.disconnected) {
        _connected = false;
        print('[BleClient] Desconectado');
      }
    });

    await _discoverAndSubscribe();
  }

  Future<void> _discoverAndSubscribe() async {
    final services = await _device!.discoverServices();

    bool foundService = false;
    int subscribedCharacteristics = 0;

    for (final svc in services) {
      if (svc.uuid.toString().toLowerCase() !=
          BleConstants.serviceUUID.toLowerCase()) continue;

      foundService = true;
      print('[BleClient] Servicio de actividad encontrado');

      for (final char in svc.characteristics) {
        final uuid = char.uuid.toString().toLowerCase();

        // Activar notificaciones en cada característica
        if (char.properties.notify) {
          await char.setNotifyValue(true);
          print('[BleClient] NOTIFY activado: $uuid');
        }

        // Suscribirse al stream de valores
        final sub = char.lastValueStream.listen((bytes) {
          _handleValue(uuid, bytes);
        });
        _subs.add(sub);

        if (char.properties.notify) subscribedCharacteristics++;
      }
    }

    // Si no encontramos servicio o no pudimos activar notify en ninguna
    // característica, fallamos de forma controlada (para que la UI muestre
    // estado error en vez de que la app se cierre).
    if (!foundService) {
      throw Exception(
        'Servicio BLE de actividad (${BleConstants.serviceUUID}) no encontrado en el wearable.',
      );
    }

    if (subscribedCharacteristics == 0) {
      throw Exception(
        'El wearable no expone características con NOTIFY para el servicio (${BleConstants.serviceUUID}).',
      );
    }
  }


  void _handleValue(String uuid, List<int> bytes) {
    if (bytes.isEmpty) return;

    try {
      if (uuid == BleConstants.stepsUUID.toLowerCase()) {
        final bd = ByteData.sublistView(Uint8List.fromList(bytes));
        _current = _current.copyWith(steps: bd.getInt32(0, Endian.little));
      } else if (uuid == BleConstants.heartRateUUID.toLowerCase()) {
        _current = _current.copyWith(heartRate: bytes[0]);
      } else if (uuid == BleConstants.caloriesUUID.toLowerCase()) {
        final bd = ByteData.sublistView(Uint8List.fromList(bytes));
        _current = _current.copyWith(calories: bd.getInt16(0, Endian.little));
      } else if (uuid == BleConstants.statusUUID.toLowerCase()) {
        _current = _current.copyWith(status: utf8.decode(bytes));
      }

      _dataCtrl.add(_current);
    } catch (e) {
      print('[BleClient] Error parseando $uuid: $e');
    }
  }

  Future<void> disconnect() async {
    for (final s in _subs) await s.cancel();
    _subs.clear();
    await _device?.disconnect();
    _connected = false;
  }

  void dispose() {
    _dataCtrl.close();
  }
}
