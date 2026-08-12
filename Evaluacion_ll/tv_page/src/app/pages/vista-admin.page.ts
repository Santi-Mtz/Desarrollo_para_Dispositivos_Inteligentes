import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

interface TipoArma {
  id: number;
  nombre: string;
}

interface ArmaAdmin {
  id: number;
  nombre: string;
  tipo_id: number | null;
  rareza: number;
  peso: string;
  escalado: string;
  descripcion: string;
}

@Component({
  selector: 'app-vista-admin-page',
  standalone: true,
  imports: [CardModule, TagModule, ButtonModule, RouterLink, FormsModule, InputTextModule, CommonModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Mi perfil (Administrador)</h3>
        <p>Gestiona tu cuenta y tus tareas de administración desde un solo lugar.</p>
      </div>

      <p-card header="Resumen de perfil" subheader="Información de acceso administrativo">
        <div class="wiki-card-grid">
          <p-card subheader="Cuenta">
            <ng-template pTemplate="title">Datos de administrador</ng-template>
            <p><strong>Nombre:</strong> {{ currentUser()?.nombre ?? 'Sin datos' }}</p>
            <p><strong>Correo:</strong> {{ currentUser()?.email ?? 'Sin datos' }}</p>
            <p-tag severity="danger" [value]="'Rol: ' + (currentUser()?.role ?? 'admin')"></p-tag>
          </p-card>

          <p-card subheader="Identidad">
            <ng-template pTemplate="title">Avatar textual</ng-template>
            <p>Referencia rápida para sesiones de administración.</p>
            <p-tag severity="info" [value]="'Iniciales: ' + initials()"></p-tag>
          </p-card>

          <p-card subheader="Seguridad">
            <ng-template pTemplate="title">Buenas prácticas</ng-template>
            <p>Mantén credenciales seguras y revisa accesos periódicamente.</p>
            <p-tag severity="success" value="Protegido"></p-tag>
          </p-card>
        </div>

        <div class="wiki-card-grid">
          <p-card subheader="Contenido">
            <ng-template pTemplate="title">Revisar secciones</ng-template>
            <p>Actualiza entradas de armas, hechizos y builds.</p>
            <p-tag severity="info" value="Gestión"></p-tag>
          </p-card>

          <p-card subheader="Usuarios">
            <ng-template pTemplate="title">Control de cuentas</ng-template>
            <p>Supervisa registro, acceso y actividad del sistema.</p>
            <p-tag severity="warn" value="Moderación"></p-tag>
          </p-card>

          <p-card subheader="Sistema">
            <ng-template pTemplate="title">Estado del sitio</ng-template>
            <p>Verifica conexión API y consistencia de datos.</p>
            <p-tag severity="contrast" value="Monitoreo"></p-tag>
          </p-card>
        </div>

        <div class="wiki-actions">
          <a pButton routerLink="/armas" icon="pi pi-sparkles" label="Gestionar armas"></a>
          <a pButton routerLink="/seguridad" icon="pi pi-shield" label="Configurar 2FA" severity="warn"></a>
          <a pButton routerLink="/contacto" icon="pi pi-envelope" label="Responder mensajes" severity="secondary"></a>
          <a pButton routerLink="/personajes" icon="pi pi-users" label="Revisar perfiles" severity="contrast"></a>
        </div>
      </p-card>

      <p-card header="CRUD de armas" subheader="Cambios visibles para usuarios en tiempo real">
        @if (!isAdmin()) {
          <p>No tienes permisos de administrador.</p>
        } @else {
          <div class="wiki-card-grid">
            <p-card [subheader]="editingId() ? 'Editando arma #' + editingId() : 'Nueva arma'">
              <ng-template pTemplate="title">Formulario</ng-template>

              <div class="wiki-form-grid">
                <label>
                  <span>Nombre</span>
                  <input pInputText type="text" [(ngModel)]="form.nombre" placeholder="Ej. Moonveil" />
                </label>

                <label>
                  <span>Tipo</span>
                  <select [(ngModel)]="form.tipo_id">
                    <option [value]="null">-- Selecciona tipo --</option>
                    @for (tipo of tiposArma(); track tipo.id) {
                      <option [value]="tipo.id">{{ tipo.nombre }}</option>
                    }
                  </select>
                </label>

                <label>
                  <span>Rareza (1-5)</span>
                  <input pInputText type="number" min="1" max="5" [(ngModel)]="form.rareza" />
                </label>

                <label>
                  <span>Peso</span>
                  <input pInputText type="number" min="0" step="0.1" [(ngModel)]="form.peso" />
                </label>

                <label>
                  <span>Escalado</span>
                  <input pInputText type="text" [(ngModel)]="form.escalado" placeholder="Ej. DEX/INT" />
                </label>

                <label class="wiki-form-wide">
                  <span>Descripción</span>
                  <textarea pInputText rows="4" [(ngModel)]="form.descripcion" placeholder="Describe el arma"></textarea>
                </label>
              </div>

              <div class="wiki-actions">
                <button pButton type="button" icon="pi pi-check" [label]="editingId() ? 'Guardar cambios' : 'Crear arma'" (click)="saveArma()"></button>
                <button pButton type="button" icon="pi pi-refresh" label="Limpiar" severity="secondary" (click)="resetForm()"></button>
              </div>
            </p-card>

            <p-card subheader="Lista administrable">
              <ng-template pTemplate="title">Armas actuales</ng-template>
              <div class="wiki-actions">
                <p-tag severity="contrast" [value]="armas().length + ' registradas'"></p-tag>
                <button pButton type="button" icon="pi pi-sync" label="Recargar" severity="secondary" (click)="loadArmas()"></button>
              </div>

              @if (errorMessage()) {
                <p>{{ errorMessage() }}</p>
              }

              <div class="wiki-list-grid">
                @for (arma of armas(); track arma.id) {
                  <div class="wiki-list-row">
                    <div>
                      <strong>{{ arma.nombre }}</strong>
                      <small>Rareza {{ arma.rareza }} · Peso {{ arma.peso }} · {{ arma.escalado || 'Sin escalado' }}</small>
                    </div>
                    <div class="wiki-actions">
                      <button pButton type="button" icon="pi pi-pencil" label="Editar" size="small" severity="info" (click)="editArma(arma)"></button>
                      <button pButton type="button" icon="pi pi-trash" label="Eliminar" size="small" severity="danger" (click)="deleteArma(arma.id)"></button>
                    </div>
                  </div>
                }
              </div>
            </p-card>
          </div>
        }
      </p-card>
    </section>
  `
})
export class VistaAdminPage {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly armas = signal<ArmaAdmin[]>([]);
  protected readonly tiposArma = signal<TipoArma[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly form: {
    nombre: string;
    tipo_id: number | null;
    rareza: number;
    peso: number;
    escalado: string;
    descripcion: string;
  } = {
    nombre: '',
    tipo_id: null,
    rareza: 1,
    peso: 0,
    escalado: '',
    descripcion: ''
  };
  protected readonly initials = computed(() => {
    const name = this.currentUser()?.nombre?.trim() ?? '';
    if (!name) {
      return 'AD';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return `${first}${second}`.toUpperCase() || 'AD';
  });

  constructor() {
    this.loadArmas();
    this.loadTipos();
  }

  protected loadTipos(): void {
    this.http.get<TipoArma[]>('/api/tipos-arma').subscribe({
      next: (data) => {
        this.tiposArma.set(data ?? []);
      },
      error: (err) => {
        console.error('Error al cargar tipos de arma:', err);
      }
    });
  }

  protected loadArmas(): void {
    this.http.get<ArmaAdmin[]>('/api/armas').subscribe({
      next: (data) => {
        this.armas.set(data ?? []);
        this.errorMessage.set('');
      },
      error: (err) => {
        const errorMsg = `No se pudo cargar el listado de armas: ${err?.error?.message ?? err?.message ?? 'error desconocido'}`;
        this.errorMessage.set(errorMsg);
        console.error('Error al cargar armas:', err);
      }
    });
  }

  protected editArma(arma: ArmaAdmin): void {
    this.editingId.set(arma.id);
    this.form.nombre = arma.nombre;
    this.form.tipo_id = arma.tipo_id;
    this.form.rareza = arma.rareza;
    this.form.peso = Number(arma.peso);
    this.form.escalado = arma.escalado ?? '';
    this.form.descripcion = arma.descripcion ?? '';
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.form.nombre = '';
    this.form.tipo_id = null;
    this.form.rareza = 1;
    this.form.peso = 0;
    this.form.escalado = '';
    this.form.descripcion = '';
    this.errorMessage.set('');
  }

  protected saveArma(): void {
    const payload = {
      nombre: this.form.nombre,
      tipo_id: this.form.tipo_id,
      rareza: this.form.rareza,
      peso: this.form.peso,
      escalado: this.form.escalado,
      descripcion: this.form.descripcion
    };

    if (!payload.nombre.trim()) {
      this.errorMessage.set('El nombre es obligatorio.');
      return;
    }

    const headers = { 'x-user-role': this.currentUser()?.role ?? '' };
    const editing = this.editingId();
    const request = editing
      ? this.http.put(`/api/armas/${editing}`, payload, { headers })
      : this.http.post('/api/armas', payload, { headers });

    request.subscribe({
      next: () => {
        this.resetForm();
        this.loadArmas();
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? err?.error ?? 'No se pudo guardar el arma.';
        this.errorMessage.set(String(errorMsg));
        console.error('Error al guardar arma:', err);
      }
    });
  }

  protected deleteArma(id: number): void {
    const headers = { 'x-user-role': this.currentUser()?.role ?? '' };
    this.http.delete(`/api/armas/${id}`, { headers }).subscribe({
      next: () => {
        if (this.editingId() === id) {
          this.resetForm();
        }
        this.loadArmas();
      },
      error: (err) => {
        const errorMsg = err?.error?.message ?? err?.error ?? 'No se pudo eliminar el arma.';
        this.errorMessage.set(String(errorMsg));
        console.error('Error al eliminar arma:', err);
      }
    });
  }
}
