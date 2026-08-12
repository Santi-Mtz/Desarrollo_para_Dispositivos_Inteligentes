import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-mapa-page',
  standalone: true,
  imports: [CardModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Mapa interactivo</h3>
        <p>Consulta ubicaciones, jefes y puntos clave de The Lands Between.</p>
      </div>

      <p-card header="Mapa de Elden Ring" subheader="Fuente: MapGenie">
        <iframe
          src="https://mapgenie.io/elden-ring/maps/the-lands-between?embed=light"
          title="Mapa interactivo de Elden Ring"
          loading="lazy"
          style="position: relative; width: 100%; height: 500px; border: 0; border-radius: 12px;"
        ></iframe>
      </p-card>

      <p-card header="Mapa de Shadow Realm" subheader="Fuente: MapGenie">
        <iframe
          src="https://mapgenie.io/elden-ring/maps/the-shadow-realm?embed=light"
          title="Mapa interactivo de Shadow Realm"
          loading="lazy"
          style="position: relative; width: 100%; height: 500px; border: 0; border-radius: 12px;"
        ></iframe>
      </p-card>
    </section>
  `
})
export class MapaPage {}
