import 'package:flutter/material.dart';

class WeatherIcon extends StatelessWidget {
  final String condition;
  final double size;

  const WeatherIcon({Key? key, this.condition = 'sunny', this.size = 32})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    final c = condition.toLowerCase();
    if (c.contains('rain'))
      return Icon(Icons.beach_access, size: size, color: Colors.blue);
    if (c.contains('cloud'))
      return Icon(Icons.cloud, size: size, color: Colors.grey);
    if (c.contains('snow'))
      return Icon(Icons.ac_unit, size: size, color: Colors.lightBlue);
    return Icon(Icons.wb_sunny, size: size, color: Colors.orange);
  }
}
