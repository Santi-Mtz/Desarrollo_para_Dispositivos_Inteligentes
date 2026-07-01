import 'package:flutter/material.dart';

class AppProvider extends ChangeNotifier {
  // Estado inicial de los datos
  int steps = 0;
  int heartRate = 0;
  int calories = 0;
  String status = 'Desconectado';
  bool isConnected = false;

  // Actualizar los valores y notificar a la interfaz
  void updateData({
    int? newSteps,
    int? newHeartRate,
    int? newCalories,
    String? newStatus,
  }) {
    if (newSteps != null) steps = newSteps;
    if (newHeartRate != null) heartRate = newHeartRate;
    if (newCalories != null) calories = newCalories;
    if (newStatus != null) status = newStatus;
    
    notifyListeners();
  }

  // Cambiar el estado de conexión
  void setConnected(bool state) {
    isConnected = state;
    if (!state) {
      status = 'Desconectado';
    }
    notifyListeners();
  }
}