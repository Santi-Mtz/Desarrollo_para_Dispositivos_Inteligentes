import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Subscription } from 'rxjs';
import { LiveUpdatesService } from '../services/live-updates.service';
import { ActivatedRoute } from '@angular/router';

interface Talisman {
  id: number;
  nombre: string;
  efecto: string;
  ubicacion: string;
}

@Component({
  selector: 'app-talismanes-page',
  standalone: true,
  imports: [CardModule, ButtonModule, TagModule],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Talismanes</h3>
          <p>Encuentra efectos clave sin perder visibilidad del inventario.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="contrast" [value]="talismanes().length + ' registrados'"></p-tag>
          <button pButton type="button" icon="pi pi-sync" label="Recargar" (click)="loadTalismanes()"></button>
        </div>
      </div>
      <p-card header="Talismanes" subheader="Todos los talismanes disponibles">
        @if (talismanes().length === 0) {
          <div class="empty-state">
            Aun no hay talismanes disponibles para esta vista.
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (talisman of talismanes(); track talisman.id) {
              <p-card [subheader]="talisman.ubicacion" [attr.id]="'item-' + talisman.id">
                <ng-template pTemplate="title">{{ talisman.nombre }}</ng-template>
                <p>{{ talisman.efecto }}</p>
              </p-card>
            }
          </div>
        }
      </p-card>
    </section>
  `
})
export class TalismanesPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly liveUpdates = inject(LiveUpdatesService);
  private readonly route = inject(ActivatedRoute);
  private liveSubscription?: Subscription;
  private routeSubscription?: Subscription;
  protected talismanes = signal<Talisman[]>([]);

  ngOnInit() {
    this.routeSubscription = this.route.queryParamMap.subscribe(() => {
      this.loadTalismanes();
    });
    this.liveSubscription = this.liveUpdates.watchWikiUpdates().subscribe((event) => {
      if (event.type === 'wiki-update') {
        this.loadTalismanes();
      }
    });
  }

  ngOnDestroy() {
    this.liveSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  loadTalismanes() {
    this.http.get<Talisman[]>('/api/talismanes').subscribe({
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

        this.talismanes.set(filtered);
        this.focusTarget(filtered);
      },
      error: (err) => console.error('Error al cargar talismanes:', err)
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
