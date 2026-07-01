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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      context.read<WeatherProvider>().loadWeather('Santiago');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Climate'), centerTitle: true),
      body: Consumer<WeatherProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.errorMessage != null) {
            return Center(child: Text('Error: ${provider.errorMessage}'));
          }

          if (provider.weather == null) {
            return const Center(child: Text('No data'));
          }

          final weather = provider.weather!;
          final temperatureLabel = provider.temperatureUnit == '°C'
              ? '${weather.temperature}°C'
              : '${WeatherUtils.celsiusToFahrenheit(weather.temperature)}°F';

          return Center(
            child: SingleChildScrollView(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    temperatureLabel,
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
                  Text(
                    WeatherUtils.getWeatherIcon(weather.condition),
                    style: const TextStyle(fontSize: 72),
                  ),
                  const SizedBox(height: 24),
                  Text('Condición: ${weather.condition}'),
                  const SizedBox(height: 8),
                  Text('Humedad: ${weather.humidity}%'),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: () async {
                      final selectedCity = await Navigator.push<String>(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SearchScreen(),
                        ),
                      );

                      if (selectedCity != null && mounted) {
                        await Provider.of<WeatherProvider>(context, listen: false)
                            .loadWeather(selectedCity);
                      }
                    },
                    child: const Text('Buscar Ciudades'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      provider.toggleTemperatureUnit();
                    },
                    child: const Text('Cambiar unidad'),
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
 