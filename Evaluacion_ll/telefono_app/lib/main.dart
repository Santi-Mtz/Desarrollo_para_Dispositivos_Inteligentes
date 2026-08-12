import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter/services.dart';

// UUIDs constantes compartidas para BLE
const String serviceUuid = "19b10000-e8f2-537e-4f6c-d104768a1214";
const String runesCharUuid = "19b10001-e8f2-537e-4f6c-d104768a1214";
const String hrCharUuid = "19b10002-e8f2-537e-4f6c-d104768a1214";
const String stepsCharUuid = "19b10003-e8f2-537e-4f6c-d104768a1214";

// Backend Server URL
const String backendUrl = "https://aegis-wiki-backend.onrender.com";
// Fallback backend URL (local dev server)
const String fallbackBackendUrl = "http://10.0.2.2:3000"; // Enrutado emulador Android a local-host

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => EcosystemState()),
      ],
      child: const AegisApp(),
    ),
  );
}

class AegisApp extends StatelessWidget {
  const AegisApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AEGIS Wiki Mobile',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF111111), // Negro Absoluto
        primaryColor: const Color(0xFFC6A15B), // Oro Erdtree
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFC6A15B),
          secondary: Color(0xFFC6A15B),
          background: Color(0xFF111111),
          error: Color(0xFF9A2A2A), // Rojo Sangre
        ),
        fontFamily: 'Inter',
        useMaterial3: true,
      ),
      home: const AuthWrapper(),
    );
  }
}

enum MyConnectionState {
  disconnected,
  connecting,
  connected,
}

// ESTADO GLOBAL DE LA APLICACION (Provider)
class EcosystemState extends ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _user;
  List<dynamic> _weapons = [];
  String _activeServerUrl = "https://aegis-wiki-backend.onrender.com";

  // BLE States
  MyConnectionState _bleState = MyConnectionState.disconnected;
  BluetoothDevice? _connectedDevice;
  int _playTimeMinutes = 0;
  int _heartRate = 0;
  int _steps = 0;

  // Simulator Fallback Mode
  bool _isSimulating = false;
  Timer? _simulatorTimer;

  EcosystemState() {
    _loadSession();
  }

  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  List<dynamic> get weapons => _weapons;
  MyConnectionState get bleState => _bleState;
  int get playTimeMinutes => _playTimeMinutes;
  int get heartRate => _heartRate;
  int get steps => _steps;
  bool get isSimulating => _isSimulating;
  String get activeServerUrl => _activeServerUrl;

  bool get isAuthenticated => _token != null;

  Future<void> _loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    final userJson = prefs.getString('auth_user');
    _activeServerUrl = prefs.getString('server_url') ?? "https://aegis-wiki-backend.onrender.com";
    if (userJson != null) {
      _user = jsonDecode(userJson);
    }
    notifyListeners();
    if (isAuthenticated) {
      fetchCatalog();
    }
  }

  Future<void> updateServerUrl(String newUrl) async {
    String cleanUrl = newUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }
    _activeServerUrl = cleanUrl;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', _activeServerUrl);
    notifyListeners();
    if (isAuthenticated) {
      fetchCatalog();
    }
  }

  Future<void> saveSession(String token, Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    _token = token;
    _user = user;
    await prefs.setString('auth_token', token);
    await prefs.setString('auth_user', jsonEncode(user));
    notifyListeners();
    fetchCatalog();
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = null;
    _user = null;
    await prefs.remove('auth_token');
    await prefs.remove('auth_user');
    _stopSimulation();
    _disconnectBLE();
    notifyListeners();
  }

  Future<void> fetchCatalog() async {
    try {
      final response = await http.get(Uri.parse('$_activeServerUrl/armas')).timeout(
        const Duration(seconds: 4),
        onTimeout: () => http.get(Uri.parse('$backendUrl/armas')),
      );
      if (response.statusCode == 200) {
        _weapons = jsonDecode(response.body);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error al obtener catalogo: $e');
    }
  }

  // Sincronizar selección con la Smart TV
  Future<bool> publishWeaponSelect(int weaponId) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };
      final response = await http.post(
        Uri.parse('$_activeServerUrl/sync/publish'),
        headers: headers,
        body: jsonEncode({
          'event': 'weapon-select',
          'data': {'id': weaponId}
        }),
      ).timeout(
        const Duration(seconds: 3),
        onTimeout: () => http.post(
          Uri.parse('$backendUrl/sync/publish'),
          headers: headers,
          body: jsonEncode({
            'event': 'weapon-select',
            'data': {'id': weaponId}
          }),
        ),
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error al sincronizar con TV: $e');
      return false;
    }
  }

  Future<bool> publishViewMode(String mode) async {
    try {
      final headers = {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };
      final response = await http.post(
        Uri.parse('$_activeServerUrl/sync/publish'),
        headers: headers,
        body: jsonEncode({
          'event': 'view-mode',
          'data': {'mode': mode}
        }),
      ).timeout(
        const Duration(seconds: 3),
        onTimeout: () => http.post(
          Uri.parse('$backendUrl/sync/publish'),
          headers: headers,
          body: jsonEncode({
            'event': 'view-mode',
            'data': {'mode': mode}
          }),
        ),
      );
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error al sincronizar vista con TV: $e');
      return false;
    }
  }

  // Activar/Desactivar Simulador local
  void toggleSimulation(bool value) {
    _isSimulating = value;
    if (_isSimulating) {
      _disconnectBLE();
      _startSimulation();
    } else {
      _stopSimulation();
    }
    notifyListeners();
  }

  void _startSimulation() {
    _bleState = MyConnectionState.connected;
    _simulatorTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _steps += (1 + (timer.tick % 3));
      _heartRate = 75 + (timer.tick % 55);
      _playTimeMinutes += 10; // 10 minutos simulados por segundo real
      notifyListeners();
    });
  }

  void _stopSimulation() {
    _simulatorTimer?.cancel();
    _simulatorTimer = null;
    _bleState = MyConnectionState.disconnected;
    _playTimeMinutes = 0;
    _heartRate = 0;
    _steps = 0;
  }

  void resetPlayTime() {
    _playTimeMinutes = 0;
    notifyListeners();
  }

  Future<void> startBLEScan(BuildContext context) async {
    if (_isSimulating) return;
    if (FlutterBluePlus.isScanningNow) {
      debugPrint('Ya hay un escaneo BLE activo. Ignorando.');
      return;
    }

    try {
      final statuses = await [
        Permission.bluetoothScan,
        Permission.bluetoothConnect,
        Permission.location,
      ].request();

      if (statuses[Permission.bluetoothScan]?.isDenied == true ||
          statuses[Permission.bluetoothConnect]?.isDenied == true) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Se requieren permisos de Bluetooth para buscar el reloj.')),
        );
        return;
      }
    } catch (e) {
      debugPrint('Error al solicitar permisos BLE: $e');
    }

    if (!await FlutterBluePlus.isSupported) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bluetooth no soportado en este dispositivo.')),
      );
      return;
    }

    _bleState = MyConnectionState.disconnected;
    notifyListeners();

    try {
      FlutterBluePlus.scanResults.listen((results) {
        debugPrint('--- Cantidad de dispositivos BLE detectados: ${results.length} ---');
        for (ScanResult r in results) {
          final String advLocalName = r.advertisementData.localName;
          final String platName = r.device.platformName;
          final String advertisedUuids = r.advertisementData.serviceUuids.map((g) => g.toString()).join(', ');
          debugPrint('-> Disp: "${platName}" | AdvName: "${advLocalName}" | UUIDs: [$advertisedUuids] | RSSI: ${r.rssi}');

          final String advLocalNameLower = advLocalName.toLowerCase();
          final String platNameLower = platName.toLowerCase();
          final bool matchesUuid = r.advertisementData.serviceUuids.contains(Guid(serviceUuid)) ||
                                   r.advertisementData.serviceUuids.any((g) => g.toString().toLowerCase() == serviceUuid.toLowerCase());
          final bool matchesName = advLocalNameLower.contains("wearable") ||
                                   advLocalNameLower.contains("aegis") ||
                                   platNameLower.contains("wearable") ||
                                   platNameLower.contains("aegis");

          if (matchesUuid || matchesName) {
            debugPrint('¡COINCIDENCIA ENCONTRADA! Deteniendo escaneo y conectando a: ${platName}');
            FlutterBluePlus.stopScan();
            _connectToDevice(r.device);
            break;
          }
        }
      });

      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error de escaneo BLE: $e')),
      );
    }
  }

  Future<void> _connectToDevice(BluetoothDevice device) async {
    _bleState = MyConnectionState.connecting;
    notifyListeners();

    try {
      await device.connect(license: License.nonprofit);
      _connectedDevice = device;
      _bleState = MyConnectionState.connected;
      notifyListeners();

      device.connectionState.listen((state) {
        if (state == BluetoothConnectionState.connected) {
          _bleState = MyConnectionState.connected;
        } else {
          _bleState = MyConnectionState.disconnected;
          _connectedDevice = null;
          _playTimeMinutes = 0;
          _heartRate = 0;
          _steps = 0;
        }
        notifyListeners();
      });

      List<BluetoothService> services = await device.discoverServices();
      for (BluetoothService s in services) {
        if (s.uuid == Guid(serviceUuid)) {
          for (BluetoothCharacteristic c in s.characteristics) {
            final sub = c.onValueReceived.listen((value) {
              if (value.isNotEmpty) {
                if (c.uuid == Guid(runesCharUuid)) {
                  _playTimeMinutes = _bytesToInt(value);
                } else if (c.uuid == Guid(hrCharUuid)) {
                  _heartRate = _bytesToInt(value);
                } else if (c.uuid == Guid(stepsCharUuid)) {
                  _steps = _bytesToInt(value);
                }
                notifyListeners();
              }
            });
            device.cancelWhenDisconnected(sub);
            await c.setNotifyValue(true);
          }
        }
      }
    } catch (e) {
      _bleState = MyConnectionState.disconnected;
      _connectedDevice = null;
      notifyListeners();
    }
  }

  void _disconnectBLE() {
    _connectedDevice?.disconnect();
    _connectedDevice = null;
    _bleState = MyConnectionState.disconnected;
  }

  void disconnectBLE() {
    _disconnectBLE();
    _playTimeMinutes = 0;
    _heartRate = 0;
    _steps = 0;
    notifyListeners();
  }

  int _bytesToInt(List<int> bytes) {
    int val = 0;
    for (int i = 0; i < bytes.length; i++) {
      val += bytes[i] << (8 * i);
    }
    return val;
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<EcosystemState>(context);
    return state.isAuthenticated ? const DashboardScreen() : const LoginScreen();
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  late TextEditingController _serverUrlController;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final state = Provider.of<EcosystemState>(context, listen: false);
    _serverUrlController = TextEditingController(text: state.activeServerUrl);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    if (email.isEmpty || password.isEmpty) {
      setState(() => _error = "Rellene todos los campos.");
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    final state = Provider.of<EcosystemState>(context, listen: false);

    try {
      final response = await http.post(
        Uri.parse('${state.activeServerUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(
        const Duration(seconds: 4),
        onTimeout: () => http.post(
          Uri.parse('$backendUrl/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': password}),
        ),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && (data['token'] != null || data['user'] != null)) {
        if (!mounted) return;
        await state.saveSession(data['token'] ?? "", data['user']);
      } else {
        setState(() => _error = data['message'] ?? "Credenciales inválidas.");
      }
    } catch (e) {
      setState(() => _error = "Error al conectar con el servidor.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.shield, size: 80, color: Color(0xFFC6A15B)),
              const SizedBox(height: 16),
              const Text(
                'AEGIS Wiki',
                style: TextStyle(
                  fontFamily: 'Cinzel',
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFC6A15B),
                ),
                textAlign: TextAlign.center,
              ),
              const Text(
                'Ecosistema Móvil y Sincronización',
                style: TextStyle(color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              Card(
                color: const Color(0xFF1c1c1e),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: Color(0xFF2A2F38)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Conectividad (Dispositivo Físico)',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFC6A15B),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _serverUrlController,
                              style: const TextStyle(fontSize: 13),
                              decoration: const InputDecoration(
                                labelText: 'IP del Servidor / PC (con puerto)',
                                hintText: 'http://192.168.1.XX:3000',
                                isDense: true,
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () {
                              final url = _serverUrlController.text.trim();
                              if (url.isNotEmpty) {
                                Provider.of<EcosystemState>(context, listen: false)
                                    .updateServerUrl(url);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Servidor guardado correctamente.'),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFC6A15B),
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                            ),
                            child: const Text('OK', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  color: const Color(0xFF9A2A2A).withOpacity(0.3),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.redAccent),
                    textAlign: TextAlign.center,
                  ),
                ),
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Correo Electrónico',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFC6A15B),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.black)
                    : const Text('Iniciar Sesión', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Usa registro en la web o credenciales creadas.')),
                  );
                },
                child: const Text('¿No tienes cuenta? Registrate en la web'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIdx = 0;

  final List<Widget> _screens = [
    const CatalogTab(),
    const WearableTab(),
  ];

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<EcosystemState>(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _currentIdx == 0 ? 'CATÁLOGO WIKI' : 'TELEMETRÍA BLE',
          style: const TextStyle(fontFamily: 'Cinzel', color: Color(0xFFC6A15B)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => state.clearSession(),
          )
        ],
        backgroundColor: Colors.black,
        elevation: 0,
      ),
      body: _screens[_currentIdx],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIdx,
        selectedItemColor: const Color(0xFFC6A15B),
        unselectedItemColor: Colors.grey,
        backgroundColor: Colors.black,
        onTap: (idx) => setState(() => _currentIdx = idx),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.book),
            label: 'Catálogo',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.watch),
            label: 'Wearable',
          ),
        ],
      ),
    );
  }
}

class CatalogTab extends StatelessWidget {
  const CatalogTab({super.key});

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<EcosystemState>(context);

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.black,
          child: Row(
            children: const [
              Icon(Icons.info_outline, color: Color(0xFFC6A15B), size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Toca un arma del catálogo para proyectarla en tiempo real en tu Smart TV.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final success = await state.publishViewMode('map');
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            success
                                ? 'Proyectando Mapa Interactivo en la Smart TV'
                                : 'Error al cambiar vista en la Smart TV',
                          ),
                          backgroundColor: success ? Colors.green : Colors.red,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFC6A15B),
                    foregroundColor: Colors.black,
                  ),
                  icon: const Icon(Icons.map),
                  label: const Text('Mostrar Mapa en TV', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    final success = await state.publishViewMode('weapons');
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            success
                                ? 'Proyectando Catálogo en la Smart TV'
                                : 'Error al cambiar vista en la Smart TV',
                          ),
                          backgroundColor: success ? Colors.green : Colors.red,
                        ),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.grey[800],
                    foregroundColor: Colors.white,
                  ),
                  icon: const Icon(Icons.menu_book),
                  label: const Text('Mostrar Armas', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => state.fetchCatalog(),
            child: ListView.builder(
              itemCount: state.weapons.length,
              itemBuilder: (context, idx) {
                final weapon = state.weapons[idx];
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: const Color(0xFF1c1c1e),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    title: Text(
                      weapon['nombre'] ?? 'Sin nombre',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text('Tipo: ${weapon['tipo']}'),
                        Text('Daño Base: ${weapon['dano_base']} | Escalado: ${weapon['escalado']}'),
                      ],
                    ),
                    trailing: const Icon(Icons.tv, color: Color(0xFFC6A15B)),
                    onTap: () async {
                      final success = await state.publishWeaponSelect(weapon['id']);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              success
                                  ? 'Sincronizado: ${weapon['nombre']} enviado a Smart TV PWA'
                                  : 'Fallo al sincronizar con Smart TV PWA',
                            ),
                            backgroundColor: success ? Colors.green : Colors.red,
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    },
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class WearableTab extends StatefulWidget {
  const WearableTab({super.key});

  @override
  State<WearableTab> createState() => _WearableTabState();
}

class _WearableTabState extends State<WearableTab> {
  late TextEditingController _serverUrlController;
  bool _playTimeAlertShown = false;

  @override
  void initState() {
    super.initState();
    final state = Provider.of<EcosystemState>(context, listen: false);
    _serverUrlController = TextEditingController(text: state.activeServerUrl);
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<EcosystemState>(context);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (state.heartRate > 120 && state.bleState == MyConnectionState.connected) {
        _showCriticalAlert(context, state.heartRate);
      }
      if (state.playTimeMinutes >= 120 && state.bleState == MyConnectionState.connected) {
        _showPlayTimeAlert(context, state.playTimeMinutes);
      } else if (state.playTimeMinutes == 0) {
        _playTimeAlertShown = false;
      }
    });

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            color: const Color(0xFF1c1c1e),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
              side: const BorderSide(color: Color(0xFF2A2F38)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Servidor de Sincronización',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFC6A15B),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _serverUrlController,
                          style: const TextStyle(fontSize: 13),
                          decoration: const InputDecoration(
                            labelText: 'IP del Servidor / PC (con puerto)',
                            hintText: 'http://192.168.1.XX:3000',
                            isDense: true,
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () {
                          final url = _serverUrlController.text.trim();
                          if (url.isNotEmpty) {
                            state.updateServerUrl(url);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Servidor actualizado correctamente.'),
                                backgroundColor: Colors.green,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFC6A15B),
                          foregroundColor: Colors.black,
                        ),
                        child: const Text('Guardar'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            color: const Color(0xFF1c1c1e),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Simulador de Reloj Físico',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        'Actívalo si no posees reloj Wear OS real',
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                    ],
                  ),
                  Switch(
                    value: state.isSimulating,
                    onChanged: (val) => state.toggleSimulation(val),
                    activeColor: const Color(0xFFC6A15B),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _getBleStateColor(state.bleState).withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _getBleStateColor(state.bleState)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      _getBleStateIcon(state.bleState),
                      color: _getBleStateColor(state.bleState),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      _getBleStateText(state.bleState),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ],
                ),
                if (!state.isSimulating) ...[
                  if (state.bleState == MyConnectionState.disconnected)
                    ElevatedButton.icon(
                      onPressed: () => state.startBLEScan(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFC6A15B),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      icon: const Icon(Icons.bluetooth_searching, size: 16),
                      label: const Text('Buscar Reloj'),
                    )
                  else if (state.bleState == MyConnectionState.connecting)
                    ElevatedButton.icon(
                      onPressed: null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey[800],
                        disabledBackgroundColor: Colors.grey[900],
                        disabledForegroundColor: Colors.grey,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      icon: const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.grey,
                        ),
                      ),
                      label: const Text('Buscando...'),
                    )
                  else if (state.bleState == MyConnectionState.connected)
                    ElevatedButton.icon(
                      onPressed: () => state.disconnectBLE(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red[900],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      icon: const Icon(Icons.bluetooth_disabled, size: 16),
                      label: const Text('Desconectar'),
                    ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),

          const Text(
            'Métricas del Portador',
            style: TextStyle(fontFamily: 'Cinzel', fontSize: 20, color: Color(0xFFC6A15B)),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Tiempo de Juego',
                  _formatPlayTime(state.playTimeMinutes),
                  Icons.timer,
                  const Color(0xFFC6A15B),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildMetricCard(
                  'Ritmo Cardíaco',
                  '${state.heartRate} lpm',
                  Icons.favorite,
                  state.heartRate > 120 ? Colors.red : Colors.pinkAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          _buildMetricCard(
            'Pasos Recorridos',
            '${state.steps}',
            Icons.directions_walk,
            Colors.blueAccent,
          ),
          const SizedBox(height: 24),

          if (state.bleState == MyConnectionState.connected)
            ElevatedButton.icon(
              onPressed: () {
                state.resetPlayTime();
                _playTimeAlertShown = false;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Contador de horas de juego reiniciado.')),
                );
              },
              icon: const Icon(Icons.refresh, color: Colors.black),
              label: const Text(
                'Reiniciar Horas de Juego',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF9A2A2A),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color) {
    return Card(
      color: const Color(0xFF1c1c1e),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            Icon(icon, color: color, size: 40),
            const SizedBox(height: 12),
            Text(label, style: const TextStyle(color: Colors.grey, fontSize: 14)),
            const SizedBox(height: 6),
            Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 24),
            ),
          ],
        ),
      ),
    );
  }

  Color _getBleStateColor(MyConnectionState state) {
    switch (state) {
      case MyConnectionState.connected:
        return Colors.green;
      case MyConnectionState.connecting:
        return Colors.orange;
      case MyConnectionState.disconnected:
      default:
        return Colors.red;
    }
  }

  IconData _getBleStateIcon(MyConnectionState state) {
    switch (state) {
      case MyConnectionState.connected:
        return Icons.bluetooth_connected;
      case MyConnectionState.connecting:
        return Icons.bluetooth_searching;
      case MyConnectionState.disconnected:
      default:
        return Icons.bluetooth_disabled;
    }
  }

  String _getBleStateText(MyConnectionState state) {
    switch (state) {
      case MyConnectionState.connected:
        return "Conectado al Reloj";
      case MyConnectionState.connecting:
        return "Conectando...";
      case MyConnectionState.disconnected:
      default:
        return "Reloj Desconectado";
    }
  }

  void _showCriticalAlert(BuildContext context, int heartRate) {
    Future.microtask(() {
      showDialog(
        context: context,
        barrierDismissible: true,
        builder: (ctx) => AlertDialog(
          title: const Text('ALERTA DE SALUD', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
          content: Text(
            'El ritmo cardíaco simulado de tu portador ha superado el umbral crítico de 120 lpm (Lectura: $heartRate lpm). ¡Tu fatiga en Elden Ring es alta!',
            style: const TextStyle(fontSize: 16),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Entendido', style: TextStyle(color: Color(0xFFC6A15B))),
            ),
          ],
        ),
      );
    });
  }

  void _showPlayTimeAlert(BuildContext context, int minutes) {
    if (_playTimeAlertShown) return;
    _playTimeAlertShown = true;

    HapticFeedback.vibrate();
    Future.delayed(const Duration(milliseconds: 300), () => HapticFeedback.vibrate());
    Future.delayed(const Duration(milliseconds: 600), () => HapticFeedback.vibrate());

    Future.microtask(() {
      showDialog(
        context: context,
        barrierDismissible: true,
        builder: (ctx) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: Colors.amber),
              SizedBox(width: 8),
              Text('ALERTA DE DESCANSO', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Text(
            '¡Atención, Sinluz! Has superado 2 horas de juego continuo en Elden Ring (Tiempo acumulado: ${_formatPlayTime(minutes)}).\n\nTe recomendamos tomar un descanso de 15 minutos, hidratarte y hacer estiramientos activos.',
            style: const TextStyle(fontSize: 16),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Entendido', style: TextStyle(color: Color(0xFFC6A15B))),
            ),
          ],
        ),
      );
    });
  }

  String _formatPlayTime(int minutes) {
    final int hours = minutes ~/ 60;
    final int mins = minutes % 60;
    return '${hours}h ${mins}m';
  }
}
