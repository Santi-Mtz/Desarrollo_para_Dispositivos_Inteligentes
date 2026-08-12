import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { LiveUpdatesService } from '../services/live-updates.service';
import { ActivatedRoute } from '@angular/router';

interface Personaje {
  id: number;
  nombre: string;
  faccion: string;
  zona: string;
  descripcion: string;
}

@Component({
  selector: 'app-personajes-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Personajes</h3>
          <p>Consulta ubicación y facción sin saturar la lectura.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="contrast" [value]="personajes().length + ' registrados'"></p-tag>
          <button pButton type="button" icon="pi pi-sync" label="Recargar" (click)="loadPersonajes()"></button>
        </div>
      </div>
      <p-card header="Personajes" subheader="NPCs del mundo">
        @if (personajes().length === 0) {
          <div class="empty-state">
            Todavia no hay personajes cargados.
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (personaje of personajes(); track personaje.id) {
              <p-card [subheader]="personaje.zona" [attr.id]="'item-' + personaje.id">
                <ng-template pTemplate="title">{{ personaje.nombre }}</ng-template>
                <p>{{ personaje.descripcion }}</p>
                <p><strong>Facción:</strong> {{ personaje.faccion }}</p>
              </p-card>
            }
          </div>
        }
      </p-card>
    </section>
  `
})
export class PersonajesPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly liveUpdates = inject(LiveUpdatesService);
  private readonly route = inject(ActivatedRoute);
  private liveSubscription?: Subscription;
  private routeSubscription?: Subscription;
  protected personajes = signal<Personaje[]>([]);

  ngOnInit() {
    this.routeSubscription = this.route.queryParamMap.subscribe(() => {
      this.loadPersonajes();
    });
    this.liveSubscription = this.liveUpdates.watchWikiUpdates().subscribe((event) => {
      if (event.type === 'wiki-update') {
        this.loadPersonajes();
      }
    });
  }

  ngOnDestroy() {
    this.liveSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  loadPersonajes() {
    this.http.get<Personaje[]>('/api/personajes').subscribe({
      next: (data) => {
        const list = data ?? [];
        const params = this.route.snapshot.queryParams;
        const q = (params['q'] || '').trim().toLowerCase();
        const rawId = params['itemId'];
        const targetId = rawId ? Number(rawId) : NaN;

        let filtered = list;
        if (rawId !== null && Number.isFinite(targetId) && targetId > 0) {
          filtered = list.filter((item) => item.id === targetId);
        } else if (q) {
          filtered = list.filter((item) => item.nombre.toLowerCase().includes(q));
        }

        this.personajes.set(filtered);
        this.focusTarget(filtered);
      },
      error: (err) => console.error('Error al cargar personajes:', err)
    });
  }

  private focusTarget(items: Array<{ id: number }>): void {
    const rawId = this.route.snapshot.queryParamMap.get('itemId');
    const targetId = rawId ? Number(rawId) : NaN;
    if (rawId === null || !Number.isFinite(targetId) || targetId <= 0 || typeof document === 'undefined') {
      return;
    }

    if (!items.some((item) => item.id === targetId)) {
      return;
    }

    setTimeout(() => {
      document.getElementById(`item-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }
}
