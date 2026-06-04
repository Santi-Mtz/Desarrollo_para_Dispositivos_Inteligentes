import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/weather_provider.dart';
import '../utils/weather_utils.dart';
import 'search_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Clima Actual'), centerTitle: true),
      body: Consumer<WeatherProvider>(
        builder: (context, provider, child) {
          final weather = provider.weather;

          return Center(
            child: SingleChildScrollView(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    formatTemperature(weather.temp, weather.unit),
                    style: const TextStyle(
                      fontSize: 72,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    weather.city,
                    style: const TextStyle(fontSize: 24),
                  ),
                  const SizedBox(height: 24),
                  Icon(
                    getWeatherIcon(weather.condition),
                    size: 120,
                    color: Colors.blue,
                  ),
                  const SizedBox(height: 24),
                  Text('Condición: ${weather.condition}'),
                  const SizedBox(height: 8),
                  const Text('Humedad: 65% | Viento: 12 km/h'),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: () {
                      provider.changeCity(
                        weather.city == 'Santiago de Querétaro'
                            ? 'Ciudad de México'
                            : 'Santiago de Querétaro',
                      );
                    },
                    child: const Text('Cambiar ciudad'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      provider.changeTemperature(
                        weather.temp == 24 ? 30 : 24,
                      );
                    },
                    child: const Text('Cambiar temperatura'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SearchScreen(),
                        ),
                      );
                    },
                    child: const Text('Buscar Ciudades'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
 