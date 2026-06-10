import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../models/weather_model.dart';
import '../utils/weather_utils.dart';
import '../services/ble_service.dart';

class WeatherProvider extends ChangeNotifier {
  final BLEService _bleService = BLEService();
  
  Weather? _weather;
  bool _isLoading = false;
  String? _errorMessage;
  int _tempUnit = 0;

  // Propiedades para el control de BLE
  BluetoothDevice? _connectedDevice;
  String _bleStatusMessage = "Sin conexión BLE";
  StreamSubscription<BluetoothConnectionState>? _connectionSubscription;

  Weather? get weather => _weather;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get temperatureUnit => _tempUnit == 0 ? '°C' : '°F';

  // Getters para exponer el estado BLE a la UI
  BluetoothDevice? get connectedDevice => _connectedDevice;
  String get bleStatusMessage => _bleStatusMessage;

  Future<void> loadWeather(String city) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final normalizedCity = city.trim();
      if (normalizedCity.isEmpty) {
        throw const FormatException('City cannot be empty');
      }

      await Future.delayed(const Duration(seconds: 1));

      _weather = Weather(
        city: normalizedCity,
        temperature: 24,
        condition: 'cloudy',
        humidity: 65,
      );
    } catch (e) {
      _errorMessage = 'Error loading weather: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Paso 10: Conectar al wearable y leer datos GATT
  Future<void> connectToWearable(String deviceId) async {
    _isLoading = true;
    _bleStatusMessage = "Conectando...";
    notifyListeners();

    try {
      _connectedDevice = await _bleService.connect(deviceId);
      _bleStatusMessage = "Conectado con éxito";

      // Paso 13: Escuchar estado de desconexión en tiempo real
      _connectionSubscription?.cancel();
      _connectionSubscription = _connectedDevice!.connectionState.listen((state) {
        if (state == BluetoothConnectionState.disconnected) {
          _handleDisconnection();
        }
      });

      // UUIDs estándar de ejemplo para simulación (Servicio de Termómetro de Salud / Característica de Temp)
      const String serviceUuid = "1809";
      const String charUuid = "2A1C";

      List<int>? data = await _bleService.readGattCharacteristic(_connectedDevice!, serviceUuid, charUuid);
      
      if (data != null && data.isNotEmpty) {
        // Actualiza la temperatura local con el primer byte leído del wearable
        updateTemperature(data[0]);
      }
    } catch (e) {
      _bleStatusMessage = "Error en vinculación BLE";
      _connectedDevice = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Paso 13: Manejar la pérdida de conexión de forma limpia
  void _handleDisconnection() {
    _connectedDevice = null;
    _bleStatusMessage = "Sin conexión BLE";
    _connectionSubscription?.cancel();
    notifyListeners();
  }

  // Métodos puente para el escaneo desde la interfaz
  Stream<List<ScanResult>> scanForDevices() => _bleService.scanForDevices();
  Future<void> stopScanning() => _bleService.stopScan();

  void toggleTemperatureUnit() {
    _tempUnit = _tempUnit == 0 ? 1 : 0;
    notifyListeners();
  }

  void updateTemperature(int newTemp) {
    if (!WeatherUtils.isValidTemperature(newTemp)) {
      _errorMessage = 'Temperature out of range';
      notifyListeners();
      return;
    }

    if (_weather != null) {
      _weather = Weather(
        city: _weather!.city,
        temperature: newTemp,
        condition: _weather!.condition,
        humidity: _weather!.humidity,
      );
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _connectionSubscription?.cancel();
    super.dispose();
  }
}