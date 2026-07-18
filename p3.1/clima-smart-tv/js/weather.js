const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const CITIES = ['Queretaro', 'Ciudad de Mexico', 'Guadalajara', 'Monterrey'];

// Mapeo condicion -> archivo de video y poster
const VIDEO_MAP = {
  Clear: { video: 'assets/videos/clear.mp4', poster: 'assets/posters/clear.jpg' },
  Clouds: { video: 'assets/videos/cloudy.mp4', poster: 'assets/posters/cloudy.jpg' },
  Rain: { video: 'assets/videos/rain.mp4', poster: 'assets/posters/rain.jpg' },
  Drizzle: { video: 'assets/videos/rain.mp4', poster: 'assets/posters/rain.jpg' },
  Thunderstorm: { video: 'assets/videos/thunder.mp4', poster: 'assets/posters/thunder.jpg' },
  Snow: { video: 'assets/videos/cloudy.mp4', poster: 'assets/posters/cloudy.jpg' },
};

// Datos Mock hermosos para desarrollo si la API Key es la por defecto
const MOCK_WEATHER = {
  'Queretaro': {
    city: 'Santiago de Querétaro',
    temperature: 26,
    condition: 'Clear',
    description: 'cielo claro',
    humidity: 35,
    windSpeed: '3.2'
  },
  'Ciudad de Mexico': {
    city: 'Ciudad de México',
    temperature: 21,
    condition: 'Clouds',
    description: 'nubes dispersas',
    humidity: 60,
    windSpeed: '2.1'
  },
  'Guadalajara': {
    city: 'Guadalajara',
    temperature: 23,
    condition: 'Rain',
    description: 'lluvia ligera',
    humidity: 80,
    windSpeed: '4.0'
  },
  'Monterrey': {
    city: 'Monterrey',
    temperature: 28,
    condition: 'Thunderstorm',
    description: 'tormenta con lluvia',
    humidity: 75,
    windSpeed: '6.5'
  }
};

function getMockWeatherData(cityName) {
  // Buscar coincidencia ignorando acentos o mayúsculas
  const cleanKey = cityName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  
  if (cleanKey.includes('queretaro')) return MOCK_WEATHER['Queretaro'];
  if (cleanKey.includes('mexico')) return MOCK_WEATHER['Ciudad de Mexico'];
  if (cleanKey.includes('guadalajara')) return MOCK_WEATHER['Guadalajara'];
  if (cleanKey.includes('monterrey')) return MOCK_WEATHER['Monterrey'];
  
  return {
    city: cityName,
    temperature: 20,
    condition: 'Clouds',
    description: 'nublado',
    humidity: 50,
    windSpeed: '3.0'
  };
}

// Función para cargar dinámicamente el archivo .env local
async function loadApiKey() {
  try {
    const response = await fetch('.env');
    if (!response.ok) throw new Error('No se pudo leer .env');
    const text = await response.text();
    const env = {};
    text.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const parts = trimmed.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
      }
    });
    if (env.OPENWEATHER_API_KEY) {
      window.ENV_API_KEY = env.OPENWEATHER_API_KEY;
    }
  } catch (e) {
    console.warn('Advertencia: No se pudo cargar el archivo .env dinámicamente. Usando fallback si está definido.', e);
  }
}

async function fetchWeather(city) {
  // Asegurar que las variables de entorno están cargadas
  if (!window.ENV_API_KEY) {
    await loadApiKey();
  }

  const API_KEY = window.ENV_API_KEY || 'tu_api_key_aqui';
  
  // Si la clave es el placeholder por defecto, devolvemos datos mock
  if (API_KEY === 'tu_api_key_aqui' || !API_KEY) {
    console.log(`Usando datos de prueba (Mock) para: ${city}`);
    return getMockWeatherData(city);
  }
  
  // Sanitizar entrada
  const clean = city.trim().replace(/[^\w\s]/g, '');
  if (!clean) throw new Error('Ciudad invalida');
  
  const url = `${BASE_URL}?q=${encodeURIComponent(clean)}&appid=${API_KEY}&units=metric&lang=es`;
  
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('API key invalida');
    if (res.status === 404) throw new Error(`Ciudad '${city}' no encontrada`);
    throw new Error(`Error API: ${res.status}`);
  }
  
  const json = await res.json();
  // Validar estructura antes de usar
  if (!json.main || !json.weather?.[0]) {
    throw new Error('Respuesta de API inesperada');
  }
  
  return {
    city: json.name,
    temperature: Math.round(json.main.temp),
    condition: json.weather[0].main,
    description: json.weather[0].description,
    humidity: json.main.humidity,
    windSpeed: json.wind?.speed?.toFixed(1) ?? '0',
  };
}

async function fetchAllCities() {
  const results = await Promise.allSettled(
    CITIES.map(city => fetchWeather(city))
  );
  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { 
          city: CITIES[i], 
          temperature: '--', 
          condition: 'Error',
          description: 'Sin datos', 
          humidity: '--', 
          windSpeed: '--' 
        }
  );
}
