import 'package:flutter/material.dart';

class WeatherUtils {
  static double celsiusToFahrenheit(int celsius) {
    return (celsius * 9 / 5) + 32;
  }

  static int fahrenheitToCelsius(double fahrenheit) {
    return ((fahrenheit - 32) * 5 / 9).toInt();
  }

  static bool isValidTemperature(int temp) {
    return temp >= -50 && temp <= 60;
  }
}

String formatTemperature(double temp, String unit) {
  return '${temp.toStringAsFixed(0)}°$unit';
}