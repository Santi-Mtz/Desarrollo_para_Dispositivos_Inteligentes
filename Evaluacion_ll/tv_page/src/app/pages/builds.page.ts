import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { LiveUpdatesService } from '../services/live-updates.service';
import { ActivatedRoute } from '@angular/router';

interface Build {
  id: number;
  nombre: string;
  enfoque: string;
  nivel_recomendado?: string;
  distribucion_puntos?: string;
  descripcion: string;
}

@Component({
  selector: 'app-builds-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Builds</h3>
          <p>Revisa enfoques listos para progresión PvE sin cambiar de pantalla.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="contrast" [value]="builds().length + ' registradas'"></p-tag>
          <button pButton type="button" icon="pi pi-sync" label="Recargar" (click)="loadBuilds()"></button>
        </div>
      </div>
      <p-card header="Builds" subheader="Construcciones de personaje recomendadas">
        @if (builds().length === 0) {
          <div class="empty-state">
            Aun no hay builds guardadas para esta sección.
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (build of builds(); track build.id) {
              <p-card [subheader]="build.enfoque" [attr.id]="'item-' + build.id">
                <ng-template pTemplate="title">{{ build.nombre }}</ng-template>
                @if (build.nivel_recomendado) {
                  <p-tag severity="warn" [value]="'Nivel recomendado: ' + build.nivel_recomendado"></p-tag>
                }
                @if (build.distribucion_puntos) {
                  <div class="build-stats-wrap">
                    <p><strong>Distribucion sugerida:</strong></p>
                    <div class="build-stats-grid">
                      @for (stat of parseDistribution(build.distribucion_puntos); track stat) {
                        <span class="build-stat-chip">{{ stat }}</span>
                      }
                    </div>
                  </div>
                }
                <p>{{ build.descripcion }}</p>
              </p-card>
            }
          </div>
        }
      </p-card>
    </section>
  `
})
export class BuildsPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly liveUpdates = inject(LiveUpdatesService);
  private readonly route = inject(ActivatedRoute);
  private liveSubscription?: Subscription;
  private routeSubscription?: Subscription;
  protected builds = signal<Build[]>([]);

  ngOnInit() {
    this.routeSubscription = this.route.queryParamMap.subscribe(() => {
      this.loadBuilds();
    });
    this.liveSubscription = this.liveUpdates.watchWikiUpdates().subscribe((event) => {
      if (event.type === 'wiki-update') {
        this.loadBuilds();
      }
    });
  }

  ngOnDestroy() {
    this.liveSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  loadBuilds() {
    this.http.get<Build[]>('/api/builds').subscribe({
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

        this.builds.set(filtered);
        this.focusTarget(filtered);
      },
      error: (err) => console.error('Error al cargar builds:', err)
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

  parseDistribution(distribution?: string): string[] {
    if (!distribution) {
      return [];
    }

    return distribution
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
