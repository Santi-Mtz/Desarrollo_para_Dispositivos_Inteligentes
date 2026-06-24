import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import 'providers/weather_provider.dart';
import 'screens/home_screen.dart';

// Modificado a Future<void> y async para permitir operaciones asíncronas al inicio
Future<void> main() async {
  // Asegura que los canales de comunicación nativos de Flutter estén listos
  WidgetsFlutterBinding.ensureInitialized(); 

  // Carga el archivo de variables de entorno antes de inflar la UI
  await dotenv.load(fileName: ".env");

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => WeatherProvider()),
      ],
      child: MaterialApp(
        title: 'Climate App',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
        home: const HomeScreen(),
      ),
    );
  }
}