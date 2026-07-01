import 'package:flutter/material.dart';

class WeatherUtils {
  static double celsiusToFahrenheit(int celsius) {
    return (celsius * 9 / 5) + 32;
  }

  static int fahrenheitToCelsius(double fahrenheit) {
    return ((fahrenheit - 32) * 5 / 9).toInt();
  }

  static String getWeatherIcon(String condition) {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return '☀️';
      case 'cloudy':
        return '☁️';
      case 'rainy':
        return '🌧️';
      case 'snowy':
        return '❄️';
      default:
        return '❓';
    }
  }

  static bool isValidTemperature(int temp) {
    return temp >= -50 && temp <= 60;
  }
}

String formatTemperature(double temp, String unit) {
  return '${temp.toStringAsFixed(0)}°$unit';
}

IconData getWeatherIcon(String condition) {
  final value = condition.toLowerCase();

  if (value.contains('rain')) return Icons.beach_access;
  if (value.contains('cloud')) return Icons.cloud;
  if (value.contains('snow')) return Icons.ac_unit;
  return Icons.wb_sunny;
}