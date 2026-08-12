import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';
import { LiveUpdatesService } from '../services/live-updates.service';
import { ActivatedRoute } from '@angular/router';
import { HighlightDirective } from '../directives/highlight.directive';

interface Arma {
  id: number;
  nombre: string;
  tipo_id: number;
  rareza: number;
  peso: string;
  escalado: string;
  descripcion: string;
}

@Component({
  selector: 'app-armas-page',
  standalone: true,
  imports: [CardModule, TagModule, ButtonModule, HighlightDirective],
  template: `
    <section class="page-section">
      <div class="section-toolbar">
        <div class="section-intro">
          <h3>Armas</h3>
          <p>Compara estadísticas base y escalado antes de invertir recursos.</p>
        </div>
        <div class="wiki-actions">
          <p-tag severity="contrast" [value]="armas().length + ' mostradas'"></p-tag>
          <button 
            pButton 
            type="button" 
            [icon]="showOnlyObtained() ? 'pi pi-filter-slash' : 'pi pi-filter'" 
            [label]="showOnlyObtained() ? 'Ver todas' : 'Solo conseguidas'" 
            [severity]="showOnlyObtained() ? 'success' : 'secondary'"
            (click)="toggleFilterObtained()"
          ></button>
          <button pButton type="button" icon="pi pi-sync" label="Recargar" (click)="loadArmas()"></button>
        </div>
      </div>
      <p-card header="Armas" subheader="Todas las armas disponibles">
        @if (armas().length === 0) {
          <div class="empty-state">
            No hay armas para mostrar con los filtros activos.
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (arma of armas(); track arma.id) {
              <p-card [subheader]="arma.escalado" [attr.id]="'item-' + arma.id" appHighlight [style]="isObtained(arma.id) ? { 'border-color': '#4caf50' } : {}">
                <ng-template pTemplate="title">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>{{ arma.nombre }}</span>
                    @if (isObtained(arma.id)) {
                      <i class="pi pi-check-circle" style="color: #4caf50; font-size: 1.15rem;"></i>
                    }
                  </div>
                </ng-template>
                <div class="weapon-card-media">
                  <img [src]="getWeaponImage(arma)" [alt]="arma.nombre" />
                </div>
                <p>{{ arma.descripcion }}</p>
                <p><strong>Rareza:</strong> {{ arma.rareza }}/5</p>
                <p><strong>Peso:</strong> {{ arma.peso }}</p>
                <p-tag [value]="arma.escalado" [severity]="getSeverity(arma.rareza)"></p-tag>

                <div class="wiki-actions" style="margin-top: 14px; justify-content: flex-end;">
                  <button 
                    pButton 
                    type="button" 
                    [icon]="isObtained(arma.id) ? 'pi pi-check' : 'pi pi-circle'" 
                    [label]="isObtained(arma.id) ? 'Conseguida' : 'Marcar conseguida'" 
                    [severity]="isObtained(arma.id) ? 'success' : 'secondary'" 
                    size="small"
                    (click)="toggleObtained(arma.id, $event)"
                  ></button>
                </div>
              </p-card>
            }
          </div>
        }
      </p-card>
    </section>
  `
})
export class ArmasPage implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly liveUpdates = inject(LiveUpdatesService);
  private readonly route = inject(ActivatedRoute);
  private liveSubscription?: Subscription;
  private routeSubscription?: Subscription;
  
  protected armas = signal<Arma[]>([]);
  protected obtainedIds = signal<Set<number>>(new Set());
  protected showOnlyObtained = signal(false);
 
  ngOnInit() {
    this.loadObtained();
    this.routeSubscription = this.route.queryParamMap.subscribe(() => {
      this.loadArmas();
    });
    this.liveSubscription = this.liveUpdates.watchWikiUpdates().subscribe((event) => {
      if (event.type === 'wiki-update') {
        this.loadArmas();
      }
    });
  }
 
  ngOnDestroy() {
    this.liveSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  protected loadObtained() {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('obtained_armas');
      if (local) {
        try {
          this.obtainedIds.set(new Set(JSON.parse(local)));
        } catch {
          this.obtainedIds.set(new Set());
        }
      }
    }
  }

  protected saveObtained() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('obtained_armas', JSON.stringify(Array.from(this.obtainedIds())));
    }
  }

  protected toggleObtained(id: number, event: Event) {
    event.stopPropagation();
    const current = new Set(this.obtainedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.obtainedIds.set(current);
    this.saveObtained();
    this.loadArmas();
  }

  protected isObtained(id: number): boolean {
    return this.obtainedIds().has(id);
  }

  protected toggleFilterObtained() {
    this.showOnlyObtained.update(v => !v);
    this.loadArmas();
  }
 
  loadArmas() {
    this.http.get<Arma[]>('/api/armas').subscribe({
      next: (data) => {
        const sorted = [...(data ?? [])].sort((a, b) => {
          const aPriority = this.getWeaponPriority(a.nombre);
          const bPriority = this.getWeaponPriority(b.nombre);
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          return a.nombre.localeCompare(b.nombre);
        });
 
        const params = this.route.snapshot.queryParams;
        const q = (params['q'] || '').trim().toLowerCase();
        const rawId = params['itemId'];
        const targetId = rawId ? Number(rawId) : NaN;
 
        let filtered = sorted;
        if (rawId !== null && Number.isFinite(targetId) && targetId > 0) {
          filtered = sorted.filter((item) => item.id === targetId);
        } else if (q) {
          filtered = sorted.filter((item) => item.nombre.toLowerCase().includes(q));
        }

        if (this.showOnlyObtained()) {
          filtered = filtered.filter((item) => this.isObtained(item.id));
        }
 
        this.armas.set(filtered);
        this.focusTarget(filtered);
      },
      error: (err) => console.error('Error al cargar armas:', err)
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

  getSeverity(rareza: number): 'success' | 'info' | 'warn' | 'danger' {
    if (rareza <= 2) return 'info';
    if (rareza === 3) return 'warn';
    return 'danger';
  }

  getWeaponImage(arma: Arma): string {
    const normalizedName = arma.nombre.trim().toLowerCase();
    const imageByExactName: Record<string, string> = {
      "lordsworn's straight sword": '/assets/lordsworns_straight_sword_straight_sword_weapon_elden_ring_wiki_guide_200px.png',
      'bastard sword': '/assets/bastard_sword_weapon_elden_ring_wiki_guide_200px.png',
      uchigatana: '/assets/uchigatana_elden_ring_wiki_guide_200px.png'
    };

    return imageByExactName[normalizedName] ?? '/assets/Logo/logo_provisional.jpg';
  }

  private getWeaponPriority(name: string): number {
    const normalizedName = name.trim().toLowerCase();
    const orderedWithImage = [
      "lordsworn's straight sword",
      'uchigatana',
      'bastard sword'
    ];

    const imageIndex = orderedWithImage.indexOf(normalizedName);
    if (imageIndex !== -1) {
      return imageIndex;
    }

    return 99;
  }
}
