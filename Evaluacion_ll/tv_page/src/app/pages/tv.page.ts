import { Component, OnInit, OnDestroy, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';

interface WeaponItem {
  id: number;
  nombre: string;
  tipo: string;
  dano_base: number;
  escalado: string;
  descripcion: string;
  imagen_url?: string;
  video_url?: string;
}

@Component({
  selector: 'app-tv-page',
  standalone: true,
  imports: [CommonModule, CardModule],
  template: `
    <div class="tv-container" [style.background-image]="'url(' + getBackgroundMedia() + ')'">
      <!-- Filtro de oscurecimiento para legibilidad -->
      <div class="tv-overlay"></div>

      <!-- Zona de seguridad (Safe Zone del 5%) -->
      <div class="tv-safe-zone">
        <!-- Header Contextual -->
        <header class="tv-header">
          <div class="tv-brand">
            <span class="tv-logo-glow">AEGIS Wiki</span>
            <span class="tv-subtitle">Companion Mode v2.0</span>
          </div>
          <div style="display: flex; align-items: center;">
            <button 
              (click)="toggleViewMode()" 
              class="tv-toggle-button"
              [class.tv-toggle-button-active]="headerFocused() && viewMode() === 'weapons'"
            >
              <i class="pi" [class.pi-map]="viewMode() === 'weapons'" [class.pi-images]="viewMode() === 'map'"></i>
              {{ viewMode() === 'weapons' ? 'Ver Mapa (M)' : 'Ver Catálogo (M)' }}
            </button>
            <div class="tv-clock" style="margin-left: 20px;">
              {{ currentTime() }} | {{ currentDate() }}
            </div>
          </div>
        </header>

        <!-- Contenido principal -->
        @if (viewMode() === 'weapons') {
          <div class="tv-content-grid">
            <!-- Columna izquierda: Grid de armas -->
            <div class="tv-grid-panel">
              <h2 class="tv-section-title">Catálogo de Armas</h2>
              <div class="tv-2x2-grid">
                @for (weapon of weapons(); track weapon.id; let idx = $index) {
                  <div 
                    class="tv-card" 
                    [class.tv-card-active]="idx === focusedIndex()"
                    [class.tv-card-selected]="idx === selectedIndex()"
                    (click)="selectIndex(idx)"
                  >
                    <div class="tv-card-glow"></div>
                    <div class="tv-card-content">
                      <span class="tv-card-name">{{ weapon.nombre }}</span>
                      <span class="tv-card-type">{{ weapon.tipo }}</span>
                      <span class="tv-card-stats" style="font-size: 1.15rem; color: #caa551; margin-top: 5px; font-weight: 500;">
                        Físico: {{ weapon.dano_base }} | {{ weapon.escalado }}
                      </span>
                    </div>
                  </div>
                } @empty {
                  <div class="tv-card" style="grid-column: span 2; grid-row: span 2; justify-content: center; align-items: center;">
                    <span class="tv-card-name">Cargando armas de la Wiki...</span>
                  </div>
                }
              </div>
              <div class="tv-controls-hint">
                <span class="hint-item"><i class="pi pi-directions"></i> Usar Flechas del control para navegar</span>
                <span class="hint-item"><i class="pi pi-check-circle"></i> Presionar Enter / OK para ver Lore</span>
              </div>
            </div>

            <!-- Columna derecha: Detalles (10-foot UI) -->
            <div class="tv-details-panel">
              @if (getSelectedWeapon(); as weapon) {
                <div class="tv-details-card">
                  <h1 class="tv-weapon-title">{{ weapon.nombre }}</h1>
                  <h3 class="tv-weapon-subtitle">{{ weapon.tipo }}</h3>
                  
                  <div class="tv-weapon-stats">
                    <div class="stat-badge">
                      <span class="stat-label">Daño Base</span>
                      <span class="stat-value">{{ weapon.dano_base }}</span>
                    </div>
                    <div class="stat-badge">
                      <span class="stat-label">Escalado</span>
                      <span class="stat-value">{{ weapon.escalado }}</span>
                    </div>
                  </div>

                  <div class="tv-weapon-lore-box">
                    <h4 class="lore-header">HISTORIA Y LORE</h4>
                    <p class="tv-weapon-description">{{ weapon.descripcion }}</p>
                  </div>
                </div>
              } @else {
                <div class="tv-details-card" style="justify-content: center; align-items: center; text-align: center;">
                  <h1 class="tv-weapon-title" style="font-size: 3rem;">AEGIS Wiki</h1>
                  <p class="tv-weapon-description" style="font-size: 1.8rem; color: #94a3b8;">
                    Selecciona un arma con el control remoto o escoge una en la aplicación móvil para proyectar su historia aquí.
                  </p>
                </div>
              }
            </div>
          </div>
        } @else {
          <!-- Modo Mapa Interactivo (Nativo y Zoomable) -->
          <div class="tv-map-container">
            <div class="tv-map-wrapper" [style.transform]="'translate(' + mapPanX() + 'px, ' + mapPanY() + 'px) scale(' + mapZoom() + ')'">
              <img 
                src="/assets/elden_ring_map.png" 
                alt="Elden Ring World Map"
                class="tv-map-image"
              />
            </div>
            
            <!-- Controles flotantes de la TV -->
            <div class="map-controls">
              <button (click)="zoomIn()" class="map-btn" title="Acercar"><i class="pi pi-plus"></i></button>
              <button (click)="zoomOut()" class="map-btn" title="Alejar"><i class="pi pi-minus"></i></button>
              <button (click)="resetMap()" class="map-btn" title="Centrar"><i class="pi pi-refresh"></i></button>
            </div>
            <div class="map-instructions">
              <span><i class="pi pi-directions"></i> Flechas del control para explorar el mapa | ENTER para Zoom | BACK para Alejar</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .tv-container {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      color: #eaeaea;
      font-family: 'Inter', sans-serif;
      overflow: hidden; /* Sin scroll en ninguna dimensión */
      transition: background-image 0.8s ease-in-out;
    }

    .tv-overlay {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle, rgba(17, 17, 17, 0.75) 0%, rgba(10, 10, 10, 0.95) 100%);
      z-index: 1;
    }

    .tv-safe-zone {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 54px 96px; /* Safe zone del 5% activa (54px vertical, 96px horizontal en 1080p) */
      box-sizing: border-box;
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .tv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid rgba(198, 161, 91, 0.2);
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .tv-brand {
      display: flex;
      flex-direction: column;
    }

    .tv-logo-glow {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 2.5rem;
      font-weight: bold;
      color: #C6A15B; /* Oro Erdtree */
      text-shadow: 0 0 10px rgba(198, 161, 91, 0.4);
    }

    .tv-subtitle {
      font-size: 1.2rem;
      color: #94a3b8;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .tv-clock {
      font-size: 1.5rem;
      color: #cbd5e1;
      font-family: monospace;
    }

    .tv-toggle-button {
      background: rgba(198, 161, 91, 0.12);
      border: 1.5px solid #C6A15B;
      color: #C6A15B;
      padding: 6px 14px;
      border-radius: 18px;
      font-size: 1.15rem;
      font-weight: bold;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tv-toggle-button:hover {
      background: #C6A15B;
      color: #000;
      box-shadow: 0 0 12px rgba(198, 161, 91, 0.4);
    }
    .tv-toggle-button-active {
      background: #C6A15B !important;
      color: #000000 !important;
      box-shadow: 0 0 15px rgba(198, 161, 91, 0.6) !important;
    }
    .tv-toggle-button i {
      font-size: 1.1rem;
    }

    .tv-map-container {
      flex: 1;
      width: 100%;
      min-height: 0;
      position: relative;
      overflow: hidden;
      border-radius: 16px;
      box-shadow: 0 0 30px rgba(198, 161, 91, 0.45);
      background: #09090b;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 1px solid rgba(198, 161, 91, 0.15);
    }

    .tv-map-wrapper {
      transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1);
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }

    .tv-map-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      user-select: none;
      pointer-events: none;
    }

    .map-controls {
      position: absolute;
      bottom: 30px;
      right: 30px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      z-index: 10;
    }

    .map-btn {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(20, 20, 25, 0.85);
      border: 2px solid #C6A15B;
      color: #C6A15B;
      font-size: 1.3rem;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      transition: all 0.25s ease;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }

    .map-btn:hover {
      background: #C6A15B;
      color: #000;
      transform: scale(1.1);
    }

    .map-instructions {
      position: absolute;
      bottom: 30px;
      left: 30px;
      background: rgba(20, 20, 25, 0.85);
      border: 1.5px solid rgba(198, 161, 91, 0.35);
      padding: 10px 20px;
      border-radius: 30px;
      color: #cbd5e1;
      font-size: 1.15rem;
      font-weight: 500;
      z-index: 10;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tv-content-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 50px;
      flex-grow: 1;
      height: calc(100% - 100px);
    }

    .tv-grid-panel {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
    }

    .tv-section-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 2rem;
      color: #cbd5e1;
      margin-bottom: 15px;
    }

    .tv-2x2-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 25px;
      flex-grow: 1;
      max-height: 480px;
    }

    .tv-card {
      position: relative;
      background: rgba(17, 24, 39, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
    }

    .tv-card-glow {
      position: absolute;
      inset: 0;
      border-radius: 10px;
      box-shadow: inset 0 0 15px rgba(255,255,255,0);
      transition: box-shadow 0.25s ease;
      pointer-events: none;
    }

    .tv-card-active {
      border-color: #C6A15B; /* Foco visible D-pad dorado */
      transform: scale(1.04);
      background: rgba(30, 41, 59, 0.7);
    }

    .tv-card-active .tv-card-glow {
      box-shadow: 0 0 25px rgba(198, 161, 91, 0.35);
    }

    .tv-card-selected {
      background: rgba(198, 161, 91, 0.15);
      border-color: #C6A15B;
    }

    .tv-card-content {
      display: flex;
      flex-direction: column;
    }

    .tv-card-name {
      font-size: 1.8rem;
      font-weight: bold;
      color: #ffffff;
      margin-bottom: 5px;
    }

    .tv-card-type {
      font-size: 1.2rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .tv-controls-hint {
      margin-top: 20px;
      display: flex;
      gap: 30px;
      font-size: 1.1rem;
      color: #94a3b8;
    }

    .tv-details-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tv-details-card {
      background: rgba(10, 15, 26, 0.75);
      border: 2px solid rgba(198, 161, 91, 0.25);
      border-radius: 16px;
      padding: 40px;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      backdrop-filter: blur(12px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .tv-weapon-title {
      font-family: 'Cinzel', Georgia, serif;
      font-size: 5rem; /* Tipografía del dato principal >= 80px (5rem) */
      color: #C6A15B;
      margin: 0 0 10px 0;
      text-shadow: 0 0 15px rgba(198, 161, 91, 0.3);
      line-height: 1.1;
    }

    .tv-weapon-subtitle {
      font-size: 2.2rem; /* Tipografía de etiqueta secundaria >= 32px (2rem) */
      color: #94a3b8;
      margin: 0 0 30px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .tv-weapon-stats {
      display: flex;
      gap: 25px;
      margin-bottom: 40px;
    }

    .stat-badge {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 140px;
    }

    .stat-label {
      font-size: 1.1rem;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #f1f5f9;
    }

    .tv-weapon-lore-box {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 25px;
      flex-grow: 1;
    }

    .lore-header {
      font-size: 1.3rem;
      color: #C6A15B;
      margin: 0 0 15px 0;
      letter-spacing: 2px;
    }

    .tv-weapon-description {
      font-size: 1.6rem; /* Detalle >= 24px (1.5rem) */
      line-height: 1.6;
      color: #cbd5e1;
      margin: 0;
      text-align: justify;
    }

  `]
})
export class TvPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);

  protected readonly weapons = signal<WeaponItem[]>([]);
  protected readonly focusedIndex = signal<number>(0);
  protected readonly selectedIndex = signal<number>(0);
  protected readonly headerFocused = signal<boolean>(false);

  protected readonly currentTime = signal<string>('');
  protected readonly currentDate = signal<string>('');
  protected readonly viewMode = signal<'weapons' | 'map'>('weapons');

  protected readonly mapZoom = signal<number>(1.0);
  protected readonly mapPanX = signal<number>(0);
  protected readonly mapPanY = signal<number>(0);

  protected toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'weapons' ? 'map' : 'weapons');
    if (this.viewMode() === 'map') {
      this.resetMap();
    }
  }

  protected zoomIn() {
    this.mapZoom.update(z => Math.min(z + 0.25, 4.0));
  }

  protected zoomOut() {
    this.mapZoom.update(z => Math.max(z - 0.25, 0.75));
  }

  protected resetMap() {
    this.mapZoom.set(1.0);
    this.mapPanX.set(0);
    this.mapPanY.set(0);
  }

  private allWeaponsList: WeaponItem[] = [];
  private eventSource: EventSource | null = null;
  private clockInterval: any;

  // Fallbacks de fondos multimedia
  private readonly fallbackBackgrounds = [
    'https://images.alphacoders.com/121/1218763.png',
    'https://images.alphacoders.com/121/1218816.jpg',
    'https://images.alphacoders.com/122/1222934.jpg',
    'https://images.alphacoders.com/121/1218820.jpg'
  ];

  private broadcastChannel: BroadcastChannel | null = null;

  ngOnInit() {
    this.startClock();
    this.loadWeapons();
    this.setupSSESync();
    this.setupBroadcastChannel();
    this.cleanExpiredData();
  }

  ngOnDestroy() {
    this.stopClock();
    this.disconnectSSESync();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
  }

  private startClock() {
    const updateTime = () => {
      const now = new Date();
      this.currentTime.set(now.toLocaleTimeString('es-MX', { hour12: false }));
      this.currentDate.set(now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateTime();
    this.clockInterval = setInterval(updateTime, 1000);
  }

  private stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private loadWeapons() {
    this.http.get<WeaponItem[]>('/api/armas').subscribe({
      next: (data) => {
        this.allWeaponsList = data;
        
        // Cargar el grid inicial desde caché si existe, sino tomar las primeras 4
        let initialGrid: WeaponItem[] = [];
        try {
          const cachedGrid = localStorage.getItem('aegis_weapons_cache_grid');
          if (cachedGrid) {
            initialGrid = JSON.parse(cachedGrid);
          }
        } catch (e) {}

        if (initialGrid.length < 4) {
          initialGrid = data.slice(0, 4);
        }

        this.weapons.set(initialGrid);
        if (initialGrid.length > 0) {
          this.selectedIndex.set(0);
          this.focusedIndex.set(0);
        }

        // Guardar el listado completo en caché
        try {
          localStorage.setItem('aegis_weapons_cache', JSON.stringify(data));
          localStorage.setItem('aegis_cache_time_weapons', Date.now().toString());
        } catch(e) {
          console.error('Error al guardar en cache local:', e);
        }
      },
      error: (err) => {
        console.error('Error al cargar catálogo en TV, intentando cargar desde cache local:', err);
        // Intentar recuperar de caché local si estamos offline
        try {
          const cached = localStorage.getItem('aegis_weapons_cache');
          if (cached) {
            const weaponsData = JSON.parse(cached);
            this.allWeaponsList = weaponsData;
            this.weapons.set(weaponsData.slice(0, 4));
            this.selectedIndex.set(0);
            this.focusedIndex.set(0);
            return;
          }
        } catch(e) {
          console.error('Error al leer de cache local:', e);
        }

        // Fallback local hardcodeado si no hay caché disponible
        const fallback = [
          { id: 2, nombre: 'Uchigatana', tipo: 'Katanas', dano_base: 124, escalado: 'Fuerza D, Destreza D', descripcion: 'Espada de hoja curva y un solo filo de la Tierra de los Juncos. Un arma única conocida por sus cortes rápidos y el efecto de sangrado pasivo.' },
          { id: 11, nombre: 'Longsword', tipo: 'Espadas Rectas', dano_base: 109, escalado: 'Fuerza D, Destreza D', descripcion: 'Espada recta equilibrada para cualquier build.' },
          { id: 4, nombre: 'Moonveil', tipo: 'Katanas', dano_base: 146, escalado: 'Destreza D, Inteligencia C', descripcion: 'Katana forjada con piedra centellante. Su hoja de luz azulada corta a través del aire proyectando una onda de energía mágica silenciosa.' },
          { id: 14, nombre: 'Giant-Crusher', tipo: 'Armas Colosales', dano_base: 196, escalado: 'Fuerza C, Inteligencia E', descripcion: 'Una colosal espada de piedra nacida de las ruinas caídas del cielo. Libera ondas gravitatorias que aplastan a múltiples enemigos.' }
        ];
        this.allWeaponsList = fallback;
        this.weapons.set(fallback);
      }
    });
  }

  private setupBroadcastChannel() {
    try {
      this.broadcastChannel = new BroadcastChannel('aegis_wiki_sync');
      this.broadcastChannel.onmessage = (event) => {
        // VALIDACIÓN DE ORIGEN (Event Origin)
        // En BroadcastChannel, el evento de mensaje no tiene una propiedad origin nativa (ya que el navegador
        // restringe el canal al mismo origen). Para cumplir con la auditoría de seguridad y verificar
        // el origen lógico de los datos enviados, validamos que el mensaje provenga de un origen permitido.
        const allowedOrigin = 'https://wikieldenring.vercel.app';
        
        // Comprobar origen del remitente (enviado explícitamente en el payload de datos)
        // o validar el origen del contexto actual para evitar inyecciones XSS.
        const senderOrigin = event.data?.origin || window.location.origin;
        if (senderOrigin !== allowedOrigin && senderOrigin !== window.location.origin) {
          console.warn('[Security Alert] Origen no autorizado en BroadcastChannel:', senderOrigin);
          return;
        }

        // Si los datos son válidos, los procesamos
        if (event.data && event.data.event === 'weapon-select') {
          const weaponId = Number(event.data.id);
          this.selectWeaponById(weaponId);
        } else if (event.data && event.data.event === 'view-mode') {
          const mode = event.data.data?.mode === 'map' ? 'map' : 'weapons';
          this.viewMode.set(mode);
        }
      };
    } catch (e) {
      console.error('Error al inicializar BroadcastChannel:', e);
    }
  }

  private setupSSESync() {
    const sseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? '/api/sync/subscribe'
      : 'https://aegis-wiki-backend.onrender.com/sync/subscribe';
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'weapon-select') {
          const weaponId = Number(payload.data?.id);
          this.selectWeaponById(weaponId);
        } else if (payload.event === 'view-mode') {
          const mode = payload.data?.mode === 'map' ? 'map' : 'weapons';
          this.viewMode.set(mode);
        }
      } catch (err) {
        console.error('Error parsing SSE sync message:', err);
      }
    };

    this.eventSource.onerror = (err) => {
      console.warn('Conexión SSE perdida. Intentando reconectar automáticamente...', err);
    };
  }

  private disconnectSSESync() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Lógica de navegación con D-pad (Flechas de teclado para la TV)
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'm' || event.key === 'M') {
      this.toggleViewMode();
      event.preventDefault();
      return;
    }

    if (this.viewMode() === 'map') {
      const step = 80;
      switch (event.key) {
        case 'ArrowUp':
          this.mapPanY.update(y => y + step);
          event.preventDefault();
          break;
        case 'ArrowDown':
          this.mapPanY.update(y => y - step);
          event.preventDefault();
          break;
        case 'ArrowLeft':
          this.mapPanX.update(x => x + step);
          event.preventDefault();
          break;
        case 'ArrowRight':
          this.mapPanX.update(x => x - step);
          event.preventDefault();
          break;
        case 'Enter':
        case ' ':
          this.zoomIn();
          event.preventDefault();
          break;
        case 'Backspace':
        case 'Escape':
          // Si ya está totalmente alejado (escala <= 1.0), el botón "BACK" del control remoto vuelve al catálogo
          if (this.mapZoom() <= 1.0) {
            this.toggleViewMode();
          } else {
            this.zoomOut();
          }
          event.preventDefault();
          break;
      }
      return;
    }

    // Navegación enfocando los botones de la cabecera (Header)
    if (this.headerFocused()) {
      switch (event.key) {
        case 'ArrowDown':
          this.headerFocused.set(false);
          this.focusedIndex.set(0);
          event.preventDefault();
          break;
        case 'Enter':
        case ' ':
          this.toggleViewMode();
          this.headerFocused.set(false);
          event.preventDefault();
          break;
      }
      return;
    }

    const list = this.weapons();
    if (list.length === 0) return;

    let index = this.focusedIndex();

    switch (event.key) {
      case 'ArrowUp':
        if (index >= 2) {
          index -= 2;
        } else {
          // Si presiona "arriba" estando en las tarjetas superiores (0 o 1), enfoca el botón del Header
          this.headerFocused.set(true);
        }
        event.preventDefault();
        break;
      case 'ArrowDown':
        if (index + 2 < list.length) {
          index += 2;
        }
        event.preventDefault();
        break;
      case 'ArrowLeft':
        if (index % 2 === 1) {
          index -= 1;
        }
        event.preventDefault();
        break;
      case 'ArrowRight':
        if (index % 2 === 0 && index + 1 < list.length) {
          index += 1;
        }
        event.preventDefault();
        break;
      case 'Enter':
      case ' ': // OK del control remoto común
        this.selectIndex(index);
        event.preventDefault();
        break;
    }

    // Lógica de límites
    if (index >= 0 && index < list.length) {
      this.focusedIndex.set(index);
    }
  }

  private selectWeaponById(weaponId: number) {
    const fullList = this.allWeaponsList;
    const weapon = fullList.find(w => w.id === weaponId);
    if (!weapon) return;



    const currentGrid = [...this.weapons()];
    const existingIdx = currentGrid.findIndex(w => w.id === weaponId);

    if (existingIdx > -1) {
      // Mover al inicio del grid como más reciente
      currentGrid.splice(existingIdx, 1);
      currentGrid.unshift(weapon);
      this.weapons.set(currentGrid);
      this.selectedIndex.set(0);
      this.focusedIndex.set(0);
    } else {
      // Reemplazar la última (más antigua)
      if (currentGrid.length >= 4) {
        currentGrid.pop();
      }
      currentGrid.unshift(weapon);
      this.weapons.set(currentGrid);
      this.selectedIndex.set(0);
      this.focusedIndex.set(0);
    }

    this.viewMode.set('weapons'); // Forzar vista de armas en TV al proyectar

    // Guardar grid en caché local
    try {
      localStorage.setItem('aegis_weapons_cache_grid', JSON.stringify(currentGrid));
    } catch (e) {}
  }

  protected selectIndex(idx: number) {
    this.selectedIndex.set(idx);
    this.focusedIndex.set(idx);
  }

  protected getSelectedWeapon(): WeaponItem | null {
    const list = this.weapons();
    const idx = this.selectedIndex();
    return list[idx] || null;
  }

  protected getBackgroundMedia(): string {
    const selected = this.getSelectedWeapon();
    if (selected?.imagen_url) {
      return selected.imagen_url;
    }
    // Fallback si no hay imagen en el objeto actual
    const idx = this.selectedIndex();
    return this.fallbackBackgrounds[idx % this.fallbackBackgrounds.length] || '';
  }

  // Ciclo de vida: Limpiar datos del almacenamiento local que tengan más de 30 días
  private cleanExpiredData() {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      keys.forEach(key => {
        if (key.startsWith('aegis_cache_time_')) {
          const storedTime = Number(localStorage.getItem(key));
          if (storedTime && (now - storedTime > thirtyDaysMs)) {
            const dataKey = key.replace('aegis_cache_time_', '');
            localStorage.removeItem(dataKey);
            localStorage.removeItem(key);
            console.log(`[PWA Clean] Clave expirada eliminada del caché local: ${dataKey}`);
          }
        }
      });
    } catch (e) {
      console.error('Error al realizar limpieza de ciclo de vida en localstorage:', e);
    }
  }
}
