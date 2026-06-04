class Weather {
  final String city;
  final double temp;
  final String condition;
  final String unit;

  const Weather({
    required this.city,
    required this.temp,
    required this.condition,
    required this.unit,
  });

  Weather copyWith({
    String? city,
    double? temp,
    String? condition,
    String? unit,
  }) {
    return Weather(
      city: city ?? this.city,
      temp: temp ?? this.temp,
      condition: condition ?? this.condition,
      unit: unit ?? this.unit,
    );
  }
}
