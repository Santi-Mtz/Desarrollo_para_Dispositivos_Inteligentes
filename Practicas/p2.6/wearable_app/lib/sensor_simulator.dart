import 'dart:async';
import 'dart:math';

class SensorSimulator {
  final _random = Random();

  // Estado interno de los sensores
  int _steps = 0;
  int _heartRate = 72; // bpm en reposo
  double _calories = 0.0;
  String _status = 'reposo';

  // Streams que emiten nuevos valores
  final _stepsCtrl = StreamController<int>.broadcast();
  final _heartRateCtrl = StreamController<int>.broadcast();
  final _caloriesCtrl = StreamController<int>.broadcast();
  final _statusCtrl = StreamController<String>.broadcast();

  Stream<int> get stepsStream => _stepsCtrl.stream;
  Stream<int> get heartRateStream => _heartRateCtrl.stream;
  Stream<int> get caloriesStream => _caloriesCtrl.stream;
  Stream<String> get statusStream => _statusCtrl.stream;

  // Valores actuales (para lectura inicial)
  int get steps => _steps;
  int get heartRate => _heartRate;
  int get calories => _calories.toInt();
  String get status => _status;

  Timer? _timer;

  void start() {
    _timer?.cancel();
    // Actualizar sensores cada segundo
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _update());
  }

  void _update() {
    // Simular cambio de actividad aleatorio cada 30 segundos.
    if (_random.nextInt(30) == 0) {
      _changeActivity();
    }

    // Actualizar pasos segun actividad
    switch (_status) {
      case 'caminando': 
        _steps += _random.nextInt(2) + 1; 
        break;
      case 'corriendo': 
        _steps += _random.nextInt(4) + 3; 
        break;
      default:
        break; // reposo: no agrega pasos
    }

    // Ritmo cardiaco: fluctua +/- 3 bpm alrededor del objetivo
    final target = _status == 'corriendo' ? 145 : _status == 'caminando' ? 95 : 72;
    _heartRate += (_random.nextInt(7) - 3); // -3 a +3
    _heartRate = _heartRate.clamp(target - 10, target + 10);

    // Calorias: ~0.04 kcal por paso (aproximacion simple)
    _calories += _steps * 0.00004;

    // Emitir en los streams
    _stepsCtrl.add(_steps);
    _heartRateCtrl.add(_heartRate);
    _caloriesCtrl.add(_calories.toInt());
    _statusCtrl.add(_status);
  }

  void _changeActivity() {
    const activities = ['reposo', 'caminando', 'corriendo'];
    _status = activities[_random.nextInt(activities.length)];
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  void dispose() {
    stop();
    _stepsCtrl.close();
    _heartRateCtrl.close();
    _caloriesCtrl.close();
    _statusCtrl.close();
  }
}