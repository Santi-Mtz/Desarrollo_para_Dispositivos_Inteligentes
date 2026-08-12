import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';

@Component({
  selector: 'app-terminos-uso-page',
  standalone: true,
  imports: [CardModule, AccordionModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Términos de Uso</h3>
        <p>Resumen legal visible en bloques para lectura rápida.</p>
      </div>
      <p-card header="Terminos de uso" subheader="Politicas de consulta y uso del contenido">
        <p-accordion [value]="['0']" [multiple]="true">
          <p-accordion-panel value="0">
            <p-accordion-header>Uso permitido</p-accordion-header>
            <p-accordion-content>
              Puedes navegar, leer y compartir por enlace, respetando creditos y finalidad informativa.
            </p-accordion-content>
          </p-accordion-panel>
          <p-accordion-panel value="1">
            <p-accordion-header>Uso no permitido</p-accordion-header>
            <p-accordion-content>
              No se permite copia masiva del contenido ni uso para actividades que incumplan la ley.
            </p-accordion-content>
          </p-accordion-panel>
          <p-accordion-panel value="2">
            <p-accordion-header>Responsabilidad</p-accordion-header>
            <p-accordion-content>
              La informacion puede cambiar con el tiempo y no se garantiza exactitud absoluta.
            </p-accordion-content>
          </p-accordion-panel>
        </p-accordion>
      </p-card>
    </section>
  `
})
export class TerminosUsoPage {}
