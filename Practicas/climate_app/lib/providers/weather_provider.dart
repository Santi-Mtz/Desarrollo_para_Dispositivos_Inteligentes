import 'package:flutter/foundation.dart';

import '../models/weather.dart';

class WeatherProvider extends ChangeNotifier {
  Weather _weather = const Weather(
    city: 'Santiago de Querétaro',
    temp: 24,
    condition: 'cloudy',
    unit: 'C',
  );

  Weather get weather => _weather;

  bool updateWeather({
    required String city,
    required double temp,
    required String condition,
    String unit = 'C',
  }) {
    if (city.trim().isEmpty) return false;
    if (temp < -60 || temp > 60) return false;
    if (condition.trim().isEmpty) return false;
    if (unit.trim().isEmpty) return false;

    _weather = Weather(
      city: city.trim(),
      temp: temp,
      condition: condition.trim(),
      unit: unit.trim().toUpperCase(),
    );
    notifyListeners();
    return true;
  }

  void changeCity(String city) {
    updateWeather(
      city: city,
      temp: _weather.temp,
      condition: _weather.condition,
      unit: _weather.unit,
    );
  }

  void changeTemperature(double temp) {
    updateWeather(
      city: _weather.city,
      temp: temp,
      condition: _weather.condition,
      unit: _weather.unit,
    );
  }

  void changeCondition(String condition) {
    updateWeather(
      city: _weather.city,
      temp: _weather.temp,
      condition: condition,
      unit: _weather.unit,
    );
  }
}