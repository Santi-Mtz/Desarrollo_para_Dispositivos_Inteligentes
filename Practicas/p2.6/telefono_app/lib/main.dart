import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app_provider.dart';
import 'ble_client.dart';

void main() {
  runApp(
    // Envolvemos la app en el Provider para manejar el estado global
    ChangeNotifierProvider(
      create: (context) => AppProvider(),
      child: const TelefonoApp(),
    ),
  );
}

class TelefonoApp extends StatelessWidget {
  const TelefonoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Dashboard de Salud',
      theme: ThemeData.light(),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late BleClient _bleClient;

  @override
  void initState() {
    super.initState();
    // Inicializamos el cliente BLE pasándole el Provider
    final provider = Provider.of<AppProvider>(context, listen: false);
    _bleClient = BleClient(provider);
  }

  @override
  void dispose() {
    _bleClient.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Escuchamos los cambios en tiempo real
    final data = Provider.of<AppProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Monitor de Actividad', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blueAccent,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Estado: ${data.status}',
              style: TextStyle(
                fontSize: 18, 
                fontWeight: FontWeight.bold,
                color: data.isConnected ? Colors.green : Colors.grey,
              ),
            ),
            const SizedBox(height: 30),
            
            // Tarjetas de métricas
            _buildDataCard('Ritmo Cardíaco', '${data.heartRate} bpm', Icons.favorite, Colors.red),
            _buildDataCard('Pasos', '${data.steps}', Icons.directions_walk, Colors.blue),
            _buildDataCard('Calorías', '${data.calories} kcal', Icons.local_fire_department, Colors.orange),

            const SizedBox(height: 40),
            
            ElevatedButton.icon(
              onPressed: data.isConnected ? _bleClient.disconnect : _bleClient.startScan,
              icon: Icon(data.isConnected ? Icons.bluetooth_disabled : Icons.bluetooth_searching, color: Colors.white),
              label: Text(
                data.isConnected ? 'Desconectar' : 'Buscar Reloj',
                style: const TextStyle(color: Colors.white, fontSize: 16),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: data.isConnected ? Colors.red : Colors.blueAccent,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Widget reutilizable para que las métricas se vean bien
  Widget _buildDataCard(String title, String value, IconData icon, Color color) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 30, vertical: 8),
      elevation: 3,
      child: ListTile(
        leading: Icon(icon, color: color, size: 36),
        title: Text(title, style: const TextStyle(fontSize: 16, color: Colors.grey)),
        trailing: Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
      ),
    );
  }
}