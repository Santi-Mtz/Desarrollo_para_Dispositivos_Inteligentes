import 'package:flutter/material.dart';

class WeatherIcon extends StatelessWidget {
  final String condition;
  final double size;

  const WeatherIcon({
    Key? key, 
    required this.condition, 
    this.size = 32,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    IconData iconData;
    Color iconColor;

    switch (condition.toLowerCase()) {
      case 'clouds':
        iconData = Icons.cloud;
        iconColor = Colors.blueGrey;
        break;
      case 'clear':
        iconData = Icons.wb_sunny;
        iconColor = Colors.orange;
        break;
      case 'rain':
      case 'drizzle':
        iconData = Icons.umbrella;
        iconColor = Colors.blue;
        break;
      default:
        iconData = Icons.wb_cloudy_outlined;
        iconColor = Colors.grey;
    }

    return Icon(iconData, size: size, color: iconColor);
  }
}