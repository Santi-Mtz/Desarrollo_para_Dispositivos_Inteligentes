import 'package:flutter/material.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _controller = TextEditingController(); // Controla el texto libre
  String searchQuery = '';
  
  // Tus ciudades iniciales de sugerencia
  List<String> cities = ['Santiago', 'Queretaro', 'Mexico', 'Guadalajara'];
  List<String> filteredCities = [];

  @override
  void initState() {
    super.initState();
    // Al inicio, mostramos todas tus ciudades sugeridas
    filteredCities = List.from(cities);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void filterCities(String query) {
    setState(() {
      searchQuery = query;
      if (query.trim().isEmpty) {
        filteredCities = List.from(cities);
      } else {
        filteredCities = cities
            .where((city) => city.toLowerCase().contains(query.toLowerCase()))
            .toList();
      }
    });
  }

  // Método para regresar la ciudad elegida (ya sea de la lista o texto libre)
  void _submitSearch(String city) {
    if (city.trim().isNotEmpty) {
      Navigator.pop(context, city.trim());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Buscar Ciudades')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _controller,
              onChanged: filterCities,
              onSubmitted: (value) => _submitSearch(value), // Permite buscar con el "Enter" del teclado
              decoration: InputDecoration(
                hintText: 'Busca o escribe una ciudad...',
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.send), // Botón para mandar lo que escribiste libremente
                  onPressed: () => _submitSearch(_controller.text),
                ),
              ),
            ),
          ),
          Expanded(
            child: filteredCities.isEmpty && searchQuery.trim().isNotEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('No está en tus sugerencias locales.'),
                        const SizedBox(height: 12),
                        ElevatedButton.icon(
                          onPressed: () => _submitSearch(searchQuery),
                          icon: const Icon(Icons.cloud_outlined),
                          label: Text('Buscar "$searchQuery" en internet'),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: filteredCities.length,
                    itemBuilder: (context, index) {
                      return ListTile(
                        leading: const Icon(Icons.location_city),
                        title: Text(filteredCities[index]),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                        onTap: () {
                          _submitSearch(filteredCities[index]);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}