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
      if (!mounted) return;
      context.read<WeatherProvider>().fetchWeather('Queretaro');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Climate App'), 
        centerTitle: true,
      ),
      body: Consumer<WeatherProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.cloud_off, size: 64, color: Colors.red),
                    const SizedBox(height: 16),
                    Text(
                      'Error: ${provider.error}', 
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => provider.fetchWeather('Queretaro'),
                      child: const Text('Reintentar'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (provider.weather == null) {
            return const Center(child: Text('No hay datos disponibles'));
          }

          final weather = provider.weather!;
          
          final temperatureLabel = provider.temperatureUnit == '°C'
              ? '${weather.temperature}°C'
              : '${WeatherUtils.celsiusToFahrenheit(weather.temperature)}°F';

          String weatherEmoji;
          switch (weather.condition.toLowerCase()) {
            case 'clouds':
              weatherEmoji = '☁️';
              break;
            case 'clear':
              weatherEmoji = '☀️';
              break;
            case 'rain':
            case 'drizzle':
              weatherEmoji = '🌧️';
              break;
            case 'thunderstorm':
              weatherEmoji = '⛈️';
              break;
            case 'snow':
              weatherEmoji = '❄️';
              break;
            case 'mist':
            case 'fog':
            case 'haze':
              weatherEmoji = '🌫️';
              break;
            default:
              weatherEmoji = '🌈';
          }

          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    weather.city,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    temperatureLabel,
                    style: const TextStyle(
                      fontSize: 72,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    weather.description.toUpperCase(),
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    weatherEmoji,
                    style: const TextStyle(fontSize: 72),
                  ),
                  const SizedBox(height: 24),
                  
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatColumn('Humedad', '${weather.humidity}%'),
                      _buildStatColumn('Viento', '${weather.windSpeed} m/s'),
                    ],
                  ),
                  
                  const SizedBox(height: 40),
                  
                  ElevatedButton.icon(
                    onPressed: () async {
                      final selectedCity = await Navigator.push<String>(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SearchScreen(),
                        ),
                      );

                      if (selectedCity != null && mounted) {
                        await provider.fetchWeather(selectedCity);
                      }
                    },
                    icon: const Icon(Icons.search),
                    label: const Text('Buscar Ciudades'),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => provider.toggleTemperatureUnit(),
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

  Widget _buildStatColumn(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}