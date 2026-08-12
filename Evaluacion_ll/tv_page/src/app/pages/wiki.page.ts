import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-wiki-page',
  standalone: true,
  imports: [RouterLink, CardModule, ButtonModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Wiki</h3>
          <p>Elige una categoria para explorar contenido de forma rapida.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="info" value="8 categorias"></p-tag>
        </div>
      </div>

      <p-card header="Indice de secciones" subheader="Selecciona tu siguiente destino">
        <div class="wiki-card-grid">
          <a pButton routerLink="/armas" icon="pi pi-sparkles" label="Armas" severity="secondary"></a>
          <a pButton routerLink="/clases" icon="pi pi-id-card" label="Clases" severity="secondary"></a>
          <a pButton routerLink="/armaduras" icon="pi pi-shield" label="Armaduras" severity="secondary"></a>
          <a pButton routerLink="/hechizos" icon="pi pi-bolt" label="Hechizos" severity="secondary"></a>
          <a pButton routerLink="/milagros" icon="pi pi-sun" label="Milagros" severity="secondary"></a>
          <a pButton routerLink="/talismanes" icon="pi pi-star" label="Talismanes" severity="secondary"></a>
          <a pButton routerLink="/builds" icon="pi pi-cog" label="Builds" severity="secondary"></a>
          <a pButton routerLink="/personajes" icon="pi pi-users" label="Personajes" severity="secondary"></a>
        </div>
      </p-card>
    </section>
  `
})
export class WikiPage {}
