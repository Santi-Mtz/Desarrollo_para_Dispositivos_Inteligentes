import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { LiveUpdatesService } from '../services/live-updates.service';
import { ActivatedRoute } from '@angular/router';

interface Clase {
  id: number;
  nombre: string;
  enfoque: string;
  vigor: number;
  mente: number;
  resistencia: number;
  fuerza: number;
  destreza: number;
  inteligencia: number;
  fe: number;
  arcano: number;
  descripcion: string;
}

@Component({
  selector: 'app-clases-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Clases</h3>
          <p>Elige tu clase base según estilo de juego y atributos iniciales.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="contrast" [value]="clases().length + ' registradas'"></p-tag>
          <button pButton type="button" icon="pi pi-sync" label="Recargar" (click)="loadClases()"></button>
        </div>
      </div>

      <p-card header="Clases iniciales" subheader="Comparativa de atributos">
        @if (clases().length === 0) {
          <div class="empty-state">
            Aun no hay clases disponibles en esta vista.
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (clase of clases(); track clase.id) {
              <p-card [subheader]="clase.enfoque" [attr.id]="'item-' + clase.id">
                <ng-template pTemplate="title">{{ clase.nombre }}</ng-template>
                <p>{{ clase.descripcion }}</p>
                <p><strong>VIG:</strong> {{ clase.vigor }} · <strong>MND:</strong> {{ clase.mente }} · <strong>END:</strong> {{ clase.resistencia }}</p>
                <p><strong>STR:</strong> {{ clase.fuerza }} · <strong>DEX:</strong> {{ clase.destreza }}</p>
                <p><strong>INT:</strong> {{ clase.inteligencia }} · <strong>FÉ:</strong> {{ clase.fe }} · <strong>ARC:</strong> {{ clase.arcano }}</p>
              </p-card>
            }
          </div>
        }
      </p-card>
    </section>
  `
})
export class ClasesPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly liveUpdates = inject(LiveUpdatesService);
  private readonly route = inject(ActivatedRoute);
  private liveSubscription?: Subscription;
  private routeSubscription?: Subscription;
  protected readonly clases = signal<Clase[]>([]);

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe(() => {
      this.loadClases();
    });
    this.liveSubscription = this.liveUpdates.watchWikiUpdates().subscribe((event) => {
      if (event.type === 'wiki-update') {
        this.loadClases();
      }
    });
  }

  ngOnDestroy(): void {
    this.liveSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  protected loadClases(): void {
    this.http.get<Clase[]>('/api/clases').subscribe({
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

        this.clases.set(filtered);
        this.focusTarget(filtered);
      },
      error: (err) => console.error('Error al cargar clases:', err)
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
