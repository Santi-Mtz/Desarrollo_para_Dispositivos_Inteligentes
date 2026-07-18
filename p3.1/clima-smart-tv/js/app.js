function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  });
  const dateStr = now.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const clockEl = document.getElementById('currentTime');
  if (clockEl) {
    clockEl.textContent = `${dateStr} | ${timeStr}`;
  }
}
setInterval(updateClock, 1000);
updateClock();

function updateBackground(condition) {
  const map = VIDEO_MAP[condition] || VIDEO_MAP['Clouds'];
  const video = document.getElementById('bgVideo');
  if (!video) return;
  
  const source = video.querySelector('source');
  
  // Si ya se está reproduciendo el mismo video, asegurar visibilidad y salir temprano
  if (source && source.src.includes(map.video) && !video.paused) {
    video.style.opacity = '1';
    document.body.style.backgroundImage = 'none';
    return;
  }
  
  // Establecer poster como fondo en el body de inmediato (evita pantallas negras)
  document.body.style.backgroundImage = `url(${map.poster})`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  
  video.style.opacity = '0';
  
  setTimeout(() => {
    video.poster = map.poster;
    if (source) {
      source.src = map.video;
    }
    video.load();
    video.play()
      .then(() => {
        video.style.opacity = '1';
        // Quitar fondo del body tras la transición (0.5s) para no cubrir el z-index del video
        setTimeout(() => {
          if (video.style.opacity === '1') {
            document.body.style.backgroundImage = 'none';
          }
        }, 500);
      })
      .catch((err) => {
        console.warn('El video no se pudo reproducir, usando poster en el body:', err);
        video.style.opacity = '0';
      });
  }, 200);
}

function renderCard(cardId, data) {
  const card = document.getElementById(cardId);
  if (!card) return;
  
  const nameEl = card.querySelector('.city-name');
  const tempEl = card.querySelector('.temperature');
  const condEl = card.querySelector('.condition');
  const detailsEl = card.querySelector('.details');
  
  if (nameEl) nameEl.textContent = data.city;
  if (tempEl) tempEl.textContent = data.temperature !== '--' ? `${data.temperature}°C` : '--°C';
  if (condEl) condEl.textContent = data.description;
  if (detailsEl) {
    detailsEl.textContent = data.humidity !== '--' 
      ? `Humedad: ${data.humidity}% | Viento: ${data.windSpeed} m/s`
      : 'Humedad: --% | Viento: -- m/s';
  }
}

document.addEventListener('card-select', e => {
  const idx = parseInt(e.detail.cardId.replace('card', ''));
  if (window._weatherData?.[idx]) {
    const data = window._weatherData[idx];
    updateBackground(data.condition);
    const cityHeader = document.getElementById('cityName');
    if (cityHeader) {
      cityHeader.textContent = data.city;
    }
  }
});

async function init() {
  const cityHeader = document.getElementById('cityName');
  if (cityHeader && cityHeader.textContent === 'Cargando...') {
    cityHeader.textContent = 'Obteniendo datos...';
  }
  
  try {
    const data = await fetchAllCities();
    window._weatherData = data;
    data.forEach((d, i) => renderCard(`card${i}`, d));
    
    if (data[0]) {
      updateBackground(data[0].condition);
      if (cityHeader) {
        cityHeader.textContent = data[0].city;
      }
    }
  } catch (err) {
    console.error('Error cargando clima:', err.message);
    if (cityHeader) {
      cityHeader.textContent = 'Error de conexión';
    }
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('SW registrado con éxito:', reg.scope))
      .catch(err => console.error('SW error de registro:', err));
  });
}

init();
setInterval(init, 10 * 60 * 1000);
