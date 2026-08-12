import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-servicios-page',
  standalone: true,
  imports: [CardModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Servicios de la Wiki</h3>
        <p>Funciones principales organizadas para lectura rápida y navegación directa.</p>
      </div>
      <p-card header="Servicios" subheader="Lo que ofrece la wiki hoy">
        <div class="wiki-chip-row">
          <p-tag severity="info" value="Navegacion por categorias"></p-tag>
          <p-tag severity="success" value="Contenido modular"></p-tag>
          <p-tag severity="warn" value="Expansion continua"></p-tag>
          <p-tag severity="contrast" value="Integracion con API"></p-tag>
        </div>
      </p-card>
    </section>
  `
})
export class ServiciosPage {}
