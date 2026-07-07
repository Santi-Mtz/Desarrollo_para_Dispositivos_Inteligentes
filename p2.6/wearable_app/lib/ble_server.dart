import 'package:flutter/services.dart';
import 'sensor_simulator.dart';

class BleServer {
  final SensorSimulator simulator;
  static const _channel = MethodChannel('ble_peripheral_channel');
  bool _advertising = false;

  BleServer(this.simulator);

  bool get isAdvertising => _advertising;

  Future<void> startAdvertising() async {
    try {
      await _channel.invokeMethod('start');
      print('[BleServer] MethodChannel start() invocado correctamente');
      _advertising = true;
      print('[BleServer] Iniciado. Esperando conexiones...');

      // Suscribir streams del simulador y notificar cambios
      simulator.stepsStream.listen((steps) {
        _channel.invokeMethod('notifySteps', {'value': steps});
      });

      simulator.heartRateStream.listen((bpm) {
        _channel.invokeMethod('notifyHeartRate', {'value': bpm});
      });

      simulator.caloriesStream.listen((cal) {
        _channel.invokeMethod('notifyCalories', {'value': cal});
      });

      simulator.statusStream.listen((status) {
        _channel.invokeMethod('notifyStatus', {'value': status});
      });
    } catch (e) {
      _advertising = false;
      print('[BleServer] Error: $e');
      rethrow;
    }
  }

  void stop() {
    _channel.invokeMethod('stop');
    _advertising = false;
    simulator.stop();
  }
}