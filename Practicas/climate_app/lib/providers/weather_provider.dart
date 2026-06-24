import 'package:flutter/material.dart';
import '../models/weather_model.dart';
import '../services/weather_service.dart';

class WeatherProvider extends ChangeNotifier {
  final WeatherService _service = WeatherService(); // <-- Instancia del servicio HTTP real
  Weather? _weather;
  bool _isLoading = false;
  String? _error;
  int _tempUnit = 0; // 0 = °C, 1 = °F

  Weather? get weather => _weather;
  bool get isLoading => _isLoading;
  String? get error => _error; 
  String get temperatureUnit => _tempUnit == 0 ? '°C' : '°F';

  // Cambiado a fetchWeather para usar la lógica de la práctica con la API real
  Future<void> fetchWeather(String city) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      // Llamada real al servicio HTTP de OpenWeatherMap
      _weather = await _service.getWeather(city);
    } catch (e) {
      
      _error = e.toString().replaceFirst('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void toggleTemperatureUnit() {
    _tempUnit = _tempUnit == 0 ? 1 : 0;
    notifyListeners();
  }
}