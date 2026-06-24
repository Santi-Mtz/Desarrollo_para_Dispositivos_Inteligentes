import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/weather_model.dart';
import '../config/app_config.dart';

class WeatherService {
  static const Duration _timeout = Duration(seconds: 10);

  Future<Weather> getWeather(String city) async {
    if (city.trim().isEmpty) {
      throw ArgumentError('La ciudad no puede estar vacia');
    }
    
    // 2. Sanitizar (Quita acentos automáticamente para evitar el error 404 de la API)
    String cleanCity = city.trim()
        .replaceAll(RegExp(r'[áÁ]'), 'a')
        .replaceAll(RegExp(r'[éÉ]'), 'e')
        .replaceAll(RegExp(r'[íÍ]'), 'i')
        .replaceAll(RegExp(r'[óÓ]'), 'o')
        .replaceAll(RegExp(r'[úÚ]'), 'u')
        .replaceAll(RegExp(r'[^\w\s]'), '');
    
    if (!AppConfig.isConfigured()) {
      throw Exception('API key no configurada. Revisa el archivo .env');
    }
    
    final uri = Uri.parse(
      '${AppConfig.baseUrl}?q=$cleanCity&appid=${AppConfig.apiKey}&units=metric&lang=es',
    );

    try {
      final response = await http.get(uri).timeout(_timeout);
      
      switch (response.statusCode) {
        case 200:
          final json = jsonDecode(response.body) as Map<String, dynamic>;
          return Weather.fromJson(json);
        case 401:
          throw Exception('API key invalida o no activada aun');
        case 404:
          throw Exception('Ciudad "$city" no encontrada');
        case 429:
          throw Exception('Limite de llamadas excedido. Espera un momento');
        default:
          throw Exception('Error del servidor: ${response.statusCode}');
      }
    } on SocketException {
      throw Exception('Sin conexion a internet');
    } on TimeoutException {
      throw Exception('Tiempo de espera agotado. Intenta de nuevo');
    } on FormatException catch (e) {
      throw Exception('Respuesta inesperada de la API: $e');
    }
  }
}