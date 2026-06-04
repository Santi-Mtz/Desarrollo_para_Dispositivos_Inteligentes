import 'package:flutter/material.dart';
import '../utils/weather_utils.dart';

class WeatherIcon extends StatelessWidget {
  final String condition;
  final double size;

  const WeatherIcon({Key? key, this.condition = 'sunny', this.size = 32})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Icon(getWeatherIcon(condition), size: size, color: Colors.blue);
  }
} 