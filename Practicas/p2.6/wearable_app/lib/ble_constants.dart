class BleConstants {
  // Servicio principal de actividad física
  static const String serviceUUID = '12345678-1234-1234-1234-123456789abc';

  // Característica: pasos (int 32-bit, little-endian)
  static const String stepsUUID = 'aaaaaaaa-0001-1234-1234-123456789abc';

  // Característica: ritmo cardiaco (int 8-bit, bpm)
  static const String heartRateUUID = 'aaaaaaaa-0002-1234-1234-123456789abc';

  // Característica: calorías (int 16-bit)
  static const String caloriesUUID = 'aaaaaaaa-0003-1234-1234-123456789abc';

  // Característica: estado actividad (string: 'reposo'|'caminando' | 'corriendo')
  static const String statusUUID = 'aaaaaaaa-0004-1234-1234-123456789abc';
}