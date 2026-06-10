import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class BLEService {
  // Inicia el escaneo de dispositivos BLE por 15 segundos
  Stream<List<ScanResult>> scanForDevices() {
    FlutterBluePlus.startScan(timeout: const Duration(seconds: 15));
    return FlutterBluePlus.scanResults;
  }

  // Detiene el escaneo activo manualmente
  Future<void> stopScan() async {
    await FlutterBluePlus.stopScan();
  }

  // Conecta a un dispositivo BLE por su ID remoto
  Future<BluetoothDevice> connect(String deviceId) async {
    BluetoothDevice device = BluetoothDevice.fromId(deviceId);
    await device.connect(autoConnect: false);
    return device;
  }

  // Descubre servicios GATT y lee el valor de una característica específica
  Future<List<int>?> readGattCharacteristic(
    BluetoothDevice device, 
    String serviceUuid, 
    String characteristicUuid
  ) async {
    try {
      List<BluetoothService> services = await device.discoverServices();
      
      for (var service in services) {
        if (service.uuid.toString().toLowerCase() == serviceUuid.toLowerCase()) {
          for (var characteristic in service.characteristics) {
            if (characteristic.uuid.toString().toLowerCase() == characteristicUuid.toLowerCase()) {
              return await characteristic.read();
            }
          }
        }
      }
    } catch (e) {
      print("Error al leer característica GATT: $e");
    }
    return null;
  }
}