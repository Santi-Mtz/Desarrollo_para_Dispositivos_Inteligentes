import 'package:flutter/material.dart';

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