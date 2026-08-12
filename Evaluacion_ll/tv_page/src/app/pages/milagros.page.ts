import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { LiveUpdatesService } from '../services/live-updates.service';
import { ActivatedRoute } from '@angular/router';

interface Milagro {
  id: number;
  nombre: string;
  costo_fp: number;
  requisitos: string;
  descripcion: string;
}

@Component({
  selector: 'app-milagros-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Milagros</h3>
          <p>Ordena tus encantamientos por requisito y costo de FP.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="contrast" [value]="milagros().length + ' registrados'"></p-tag>
          <button pButton type="button" icon="pi pi-sync" label="Recargar" (click)="loadMilagros()"></button>
        </div>
      </div>
      <p-card header="Milagros" subheader="Todos los milagros disponibles">
        @if (milagros().length === 0) {
          <div class="empty-state">
            No hay milagros cargados en este momento.
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (milagro of milagros(); track milagro.id) {
              <p-card [subheader]="milagro.requisitos" [attr.id]="'item-' + milagro.id">
                <ng-template pTemplate="title">{{ milagro.nombre }}</ng-template>
                <p>{{ milagro.descripcion }}</p>
                <p><strong>Costo FP:</strong> {{ milagro.costo_fp }}</p>
              </p-card>
            }
          </div>
        }
      </p-card>
    </section>
  `
})
export class MilagrosPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly liveUpdates = inject(LiveUpdatesService);
  private readonly route = inject(ActivatedRoute);
  private liveSubscription?: Subscription;
  private routeSubscription?: Subscription;
  protected milagros = signal<Milagro[]>([]);

  ngOnInit() {
    this.routeSubscription = this.route.queryParamMap.subscribe(() => {
      this.loadMilagros();
    });
    this.liveSubscription = this.liveUpdates.watchWikiUpdates().subscribe((event) => {
      if (event.type === 'wiki-update') {
        this.loadMilagros();
      }
    });
  }

  ngOnDestroy() {
    this.liveSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  loadMilagros() {
    this.http.get<Milagro[]>('/api/milagros').subscribe({
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

        this.milagros.set(filtered);
        this.focusTarget(filtered);
      },
      error: (err) => console.error('Error al cargar milagros:', err)
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
