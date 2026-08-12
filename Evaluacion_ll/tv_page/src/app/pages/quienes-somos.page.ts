import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-quienes-somos-page',
  standalone: true,
  imports: [CardModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Quiénes Somos</h3>
        <p>Una base de conocimiento hecha para consultar rápido y actualizar fácil.</p>
      </div>
      <p-card header="Quienes somos" subheader="Comunidad y organizacion del contenido">
        <p>
          AEGIS Wiki es un proyecto informativo para reunir contenido util y ordenado sobre Elden Ring.
        </p>
        <p>
          Priorizamos navegacion rapida, referencias claras y actualizaciones frecuentes.
        </p>
        <div class="wiki-actions">
          <p-tag severity="success" value="Proyecto comunitario"></p-tag>
          <p-tag severity="info" value="Actualización continua"></p-tag>
        </div>
      </p-card>
    </section>
  `
})
export class QuienesSomosPage {}
