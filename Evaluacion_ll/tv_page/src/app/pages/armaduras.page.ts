import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { LiveUpdatesService } from '../services/live-updates.service';
import { ActivatedRoute } from '@angular/router';

interface Armadura {
  id: number;
  nombre: string;
  categoria: string;
  peso: string;
  defensa_fisica: string;
  defensa_magica: string;
  descripcion: string;
}

@Component({
  selector: 'app-armaduras-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Armaduras</h3>
          <p>Evalua peso y defensas para mantener movilidad y supervivencia.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="contrast" [value]="armaduras().length + ' registradas'"></p-tag>
          <button pButton type="button" icon="pi pi-sync" label="Recargar" (click)="loadArmaduras()"></button>
        </div>
      </div>
      <p-card header="Armaduras" subheader="Todas las armaduras disponibles">
        @if (armaduras().length === 0) {
          <div class="empty-state">
            No hay armaduras cargadas todavia.
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (armadura of armaduras(); track armadura.id) {
              <p-card [subheader]="armadura.categoria" [attr.id]="'item-' + armadura.id">
                <ng-template pTemplate="title">{{ armadura.nombre }}</ng-template>
                <p>{{ armadura.descripcion }}</p>
                <p><strong>Peso:</strong> {{ armadura.peso }}</p>
                <p><strong>Defensa Física:</strong> {{ armadura.defensa_fisica }}</p>
                <p><strong>Defensa Mágica:</strong> {{ armadura.defensa_magica }}</p>
              </p-card>
            }
          </div>
        }
      </p-card>
    </section>
  `
})
export class ArmadurasPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly liveUpdates = inject(LiveUpdatesService);
  private readonly route = inject(ActivatedRoute);
  private liveSubscription?: Subscription;
  private routeSubscription?: Subscription;
  protected armaduras = signal<Armadura[]>([]);

  ngOnInit() {
    this.routeSubscription = this.route.queryParamMap.subscribe(() => {
      this.loadArmaduras();
    });
    this.liveSubscription = this.liveUpdates.watchWikiUpdates().subscribe((event) => {
      if (event.type === 'wiki-update') {
        this.loadArmaduras();
      }
    });
  }

  ngOnDestroy() {
    this.liveSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  loadArmaduras() {
    this.http.get<Armadura[]>('/api/armaduras').subscribe({
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

        this.armaduras.set(filtered);
        this.focusTarget(filtered);
      },
      error: (err) => console.error('Error al cargar armaduras:', err)
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
