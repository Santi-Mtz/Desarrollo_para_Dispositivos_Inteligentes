const CACHE_STATIC = 'clima-tv-static-v1';
const CACHE_DYNAMIC = 'clima-tv-dynamic-v1';

const STATIC_ASSETS = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/weather.js',
  'js/navigation.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'assets/posters/clear.jpg',
  'assets/posters/cloudy.jpg',
  'assets/posters/rain.jpg',
  'assets/posters/thunder.jpg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => {
        console.log('SW: Pre-cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  if (!url.protocol.startsWith('http')) return;

  // Excluir el archivo .env para que siempre consulte a la red
  if (url.pathname.endsWith('.env')) {
    e.respondWith(fetch(request));
    return;
  }

  // API de clima: Network First
  if (url.hostname === 'api.openweathermap.org') {
    e.respondWith(networkFirst(request));
    return;
  }

  // Videos: Dejar que pasen directo a la red (evita problemas con Range Requests en video HTML5)
  if (url.pathname.includes('/assets/videos/')) {
    e.respondWith(fetch(request));
    return;
  }

  // Todo lo demás: Cache First (estáticos)
  e.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_DYNAMIC);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('Recurso no disponible offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const cache = await caches.open(CACHE_DYNAMIC);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.log('SW: Fallo de red, buscando en cache para:', request.url);
    const cached = await caches.match(request);
    if (cached) return cached;
    
    return new Response(
      JSON.stringify({ 
        error: 'Sin conexión', 
        message: 'No hay datos en cache disponibles para esta consulta.' 
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    );
  }
}
