import 'package:flutter/material.dart';
import 'weather_icon.dart';

class TemperatureCard extends StatelessWidget {
  final String day;
  final int tempC;
  final String condition;

  const TemperatureCard({
    Key? key,
    required this.day,
    required this.tempC,
    this.condition = 'sunny',
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(day, style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        WeatherIcon(condition: condition, size: 24),
        const SizedBox(height: 4),
        Text('$tempC°C'),
      ],
    );
  }
}