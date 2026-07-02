import 'dart:async';
import 'package:flutter/material.dart';
import '../models/activity_data.dart';
import '../services/ble_client.dart';

enum ConnectionStatus { disconnected, scanning, connected, error }

class ActivityProvider extends ChangeNotifier {
  final BleClient _client = BleClient();

  ActivityData _data = ActivityData(
    steps: 0,
    heartRate: 0,
    calories: 0,
    status: 'sin datos',
    timestamp: DateTime.now(),
  );
  ConnectionStatus _status = ConnectionStatus.disconnected;
  String? _errorMessage;
  StreamSubscription? _dataSub;

  ActivityData get data => _data;
  ConnectionStatus get status => _status;
  String? get errorMessage => _errorMessage;
  bool get isConnected => _status == ConnectionStatus.connected;

  Future<void> connect() async {
    _status = ConnectionStatus.scanning;
    _errorMessage = null;
    notifyListeners();

    // Evita fugas/suscripciones duplicadas si el usuario presiona conectar
    await _dataSub?.cancel();
    _dataSub = null;

    try {
      await _client.scanAndConnect();
      _status = ConnectionStatus.connected;
      notifyListeners();

      // Escuchar datos del wearable
      _dataSub = _client.dataStream.listen(
        (data) {
          _data = data;
          notifyListeners();
        },
        onError: (err) {
          _status = ConnectionStatus.error;
          _errorMessage = err.toString();
          notifyListeners();
        },
      );
    } catch (e) {
      _status = ConnectionStatus.error;
      _errorMessage = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
    }
  }


  Future<void> disconnect() async {
    await _dataSub?.cancel();
    await _client.disconnect();
    _status = ConnectionStatus.disconnected;
    notifyListeners();
  }

  @override
  void dispose() {
    _dataSub?.cancel();
    _client.dispose();
    super.dispose();
  }
}
