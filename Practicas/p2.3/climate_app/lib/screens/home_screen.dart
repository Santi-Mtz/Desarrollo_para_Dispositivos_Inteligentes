import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/weather_provider.dart';
import '../utils/weather_utils.dart';
import 'search_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      context.read<WeatherProvider>().loadWeather('Santiago');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Clima Actual'), centerTitle: true),
      body: Consumer<WeatherProvider>(
        builder: (context, provider, child) {
          final weather = provider.weather;

          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.errorMessage != null) {
            return Center(child: Text(provider.errorMessage!));
          }

          if (weather == null) {
            return const Center(child: Text('No data'));
          }

          final temperature = provider.temperatureUnit == '°C'
              ? WeatherUtils.formatTemperature(weather.temperature, 'C')
              : WeatherUtils.formatTemperature(
                  WeatherUtils.celsiusToFahrenheit(weather.temperature),
                  'F',
                );

          return Center(
            child: SingleChildScrollView(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    temperature,
                    style: const TextStyle(
                      fontSize: 72,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(weather.city, style: const TextStyle(fontSize: 24)),
                  const SizedBox(height: 24),
                  Text(
                    WeatherUtils.getWeatherIcon(weather.condition),
                    style: const TextStyle(fontSize: 80),
                  ),
                  const SizedBox(height: 24),
                  Text('Condición: ${weather.condition}'),
                  const SizedBox(height: 8),
                  Text('Humedad: ${weather.humidity}% | Viento: 12 km/h'),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: () {
                      provider.toggleTemperatureUnit();
                    },
                    child: const Text('Cambiar unidad'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      provider.updateTemperature(
                        weather.temperature == 24 ? 30 : 24,
                      );
                    },
                    child: const Text('Cambiar temperatura'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () async {
                      final result = await Navigator.push<String>(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SearchScreen(),
                        ),
                      );

                      if (result != null && result.isNotEmpty) {
                        await context.read<WeatherProvider>().loadWeather(result);
                      }
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
 