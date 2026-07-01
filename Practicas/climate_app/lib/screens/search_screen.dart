import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import '../providers/weather_provider.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  String searchQuery = '';
  List<String> cities = ['Santiago', 'Querétaro', 'México', 'Guadalajara'];
  List<String> filteredCities = [];
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    filteredCities = cities;
  }

  void filterCities(String query) {
    setState(() {
      searchQuery = query;
      filteredCities = cities
          .where((city) => city.toLowerCase().contains(query.toLowerCase()))
          .toList();
    });
  }

  void _toggleScan(WeatherProvider provider) {
    if (_isScanning) {
      provider.stopScanning();
      setState(() => _isScanning = false);
    } else {
      setState(() => _isScanning = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final weatherProvider = Provider.of<WeatherProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Buscar Ciudades y BLE')),
      body: Column(
        children: [
          // Sección original de búsqueda de Ciudades
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: filterCities,
              decoration: const InputDecoration(
                hintText: 'Busca una ciudad...',
                border: OutlineInputBorder(),
              ),
            ),
          ),
          
          // Listado de ciudades filtradas
          SizedBox(
            height: 120,
            child: filteredCities.isEmpty
                ? const Center(child: Text('No encontradas'))
                : ListView.builder(
                    itemCount: filteredCities.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                        title: Text(filteredCities[index]),
                        onTap: () {
                          weatherProvider.loadWeather(filteredCities[index]);
                          Navigator.pop(context, filteredCities[index]);
                        },
                      );
                    },
                  ),
          ),

          const Divider(thickness: 2),

          // Paso 13: Banner indicador del estado de la conexión BLE
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Card(
              color: weatherProvider.connectedDevice != null ? Colors.green.shade100 : Colors.orange.shade100,
              child: ListTile(
                leading: Icon(
                  weatherProvider.connectedDevice != null ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
                  color: weatherProvider.connectedDevice != null ? Colors.green : Colors.orange,
                ),
                title: Text(
                  weatherProvider.bleStatusMessage,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),

          // Paso 11: Botón dinámico para el control del escaneo BLE
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: ElevatedButton.icon(
              onPressed: () => _toggleScan(weatherProvider),
              icon: Icon(_isScanning ? Icons.stop : Icons.bluetooth_searching),
              label: Text(_isScanning ? "Detener escaneo" : "Buscar dispositivos BLE"),
              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(45)),
            ),
          ),

          // Paso 12: Listado de dispositivos encontrados o indicador de carga
          Expanded(
            child: weatherProvider.isLoading
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 10),
                        Text("Estableciendo conexión GATT..."),
                      ],
                    ),
                  )
                : _isScanning
                    ? StreamBuilder<List<ScanResult>>(
                        stream: weatherProvider.scanForDevices(),
                        initialData: const [],
                        builder: (context, snapshot) {
                          final results = snapshot.data ?? [];
                          final validDevices = results.where((r) => r.device.platformName.isNotEmpty).toList();

                          if (validDevices.isEmpty) {
                            return const Center(child: Text("Buscando señales wearables..."));
                          }

                          return ListView.builder(
                            itemCount: validDevices.length,
                            itemBuilder: (context, index) {
                              final result = validDevices[index];
                              return ListTile(
                                title: Text(result.device.platformName),
                                subtitle: Text(result.device.remoteId.toString()),
                                leading: const Icon(Icons.watch),
                                trailing: const Icon(Icons.link),
                                onTap: () async {
                                  await weatherProvider.stopScanning();
                                  setState(() => _isScanning = false);
                                  await weatherProvider.connectToWearable(result.device.remoteId.toString());
                                },
                              );
                            },
                          );
                        },
                      )
                    : const Center(child: Text("Escaneo inactivo")),
          ),
        ],
      ),
    );
  }
}