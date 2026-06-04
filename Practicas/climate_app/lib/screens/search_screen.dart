import 'package:flutter/material.dart';
import 'detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  List<String> cities = ['Santiago', 'Querétaro', 'México'];
  List<String> filtered = [];
  void filterCities(String query) {
    setState(() {
      filtered = cities
          .where((c) => c.toLowerCase().contains(query.toLowerCase()))
          .toList();
    });
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
              onChanged: filterCities,
              decoration: const InputDecoration(
                hintText: 'Busca una ciudad...',
                border: OutlineInputBorder(),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: filtered.isEmpty ? cities.length : filtered.length,
              itemBuilder: (context, index) {
                final city = filtered.isEmpty ? cities[index] : filtered[index];
                return ListTile(
                  title: Text(city),
                  subtitle: const Text('24°C '),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => DetailScreen(city: city),
                      ),
                    );
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
