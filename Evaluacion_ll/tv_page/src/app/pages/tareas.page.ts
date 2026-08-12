import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { HighlightDirective } from '../directives/highlight.directive';

interface Mision {
  id: number;
  titulo: string;
  objetivo: string;
  dificultad: 'Baja' | 'Media' | 'Alta';
  completada: boolean;
}

@Component({
  selector: 'app-tareas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, TagModule, InputTextModule, HighlightDirective],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Bitácora de Misiones del Sinluz</h3>
        <p>Administra y completa misiones comunitarias en las Tierras Intermedias mediante la manipulación del DOM y eventos.</p>
      </div>

      <div class="wiki-card-grid">
        <!-- Formulario de Creación / Edición (Métodos de Creación y Modificación de Elementos) -->
        <p-card [header]="editingId() !== null ? 'Modificar Misión' : 'Registrar Nueva Misión'" subheader="Formulario de validación activa" appHighlight>
          <div class="auth-form">
            <div class="field-wrap">
              <label for="titulo-mision">Título de la Misión</label>
              <input
                id="titulo-mision"
                pInputText
                type="text"
                [(ngModel)]="formTitulo"
                placeholder="Ej. Derrotar a Margit"
                (ngModelChange)="validateForm()"
              />
              @if (errorTitulo()) {
                <small class="field-error" id="error-title">{{ errorTitulo() }}</small>
              }
            </div>

            <div class="field-wrap" style="display: grid; gap: 4px;">
              <label for="dificultad-mision">Dificultad</label>
              <select id="dificultad-mision" [(ngModel)]="formDificultad" class="form-select" style="padding: 10px; border-radius: 8px; background: rgba(12, 16, 23, 0.85); color: #e8edf5; border: 1px solid #2f3b4a;">
                <option value="Baja">Baja (Recomendado nivel 1-30)</option>
                <option value="Media">Media (Recomendado nivel 30-70)</option>
                <option value="Alta">Alta (Recomendado nivel 70+)</option>
              </select>
            </div>

            <div class="field-wrap" style="display: grid; gap: 4px;">
              <label for="objetivo-mision">Objetivo / Detalles</label>
              <textarea
                id="objetivo-mision"
                class="form-textarea"
                rows="3"
                [(ngModel)]="formObjetivo"
                placeholder="Describe el objetivo detalladamente..."
                (ngModelChange)="validateForm()"
                style="width: 100%; border-radius: 8px; background: rgba(12, 16, 23, 0.85); color: #e8edf5; border: 1px solid #2f3b4a; padding: 10px;"
              ></textarea>
              @if (errorObjetivo()) {
                <small class="field-error" id="error-objective">{{ errorObjetivo() }}</small>
              }
            </div>

            <div class="wiki-actions">
              <button
                pButton
                type="button"
                [icon]="editingId() !== null ? 'pi pi-check' : 'pi pi-plus'"
                [label]="editingId() !== null ? 'Guardar Cambios' : 'Añadir Misión'"
                [disabled]="!isFormValid()"
                (click)="submitForm()"
                id="btn-submit-task"
              ></button>
              @if (editingId() !== null) {
                <button
                  pButton
                  type="button"
                  icon="pi pi-times"
                  label="Cancelar"
                  severity="secondary"
                  (click)="cancelEdit()"
                ></button>
              }
            </div>
          </div>
        </p-card>

        <!-- Estadísticas Dinámicas del DOM -->
        <p-card header="Progreso en las Tierras Intermedias" subheader="Actualización dinámica en tiempo real" appHighlight>
          <div class="progress-stats" style="display: flex; gap: 20px; align-items: center; justify-content: space-around; padding: 10px;">
            <div class="stat-circle" style="display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid var(--accent-gold); border-radius: 50%; width: 120px; height: 120px; background: rgba(202, 165, 81, 0.05);">
              <span class="stat-percentage" id="stats-percentage" style="font-size: 1.8rem; font-weight: 700; color: var(--accent-gold);">{{ completionRate() }}%</span>
              <span class="stat-label" style="font-size: 0.8rem; color: #aeb7c7;">Completadas</span>
            </div>
            <div class="stats-list" style="display: grid; gap: 8px;">
              <p style="margin:0;"><strong>Total de Misiones:</strong> <span id="total-tasks">{{ misiones().length }}</span></p>
              <p style="margin:0;"><strong>Misiones Activas:</strong> <span id="active-tasks" style="color: #fbc02d;">{{ activeCount() }}</span></p>
              <p style="margin:0;"><strong>Misiones Completas:</strong> <span id="completed-tasks" style="color: #4caf50;">{{ completedCount() }}</span></p>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Listado de Misiones (Visualización de Creación, Eliminación e Interacción Dinámica) -->
      <p-card header="Listado de Misiones Activas" subheader="Pasa el puntero sobre cada misión para ver el efecto estacional">
        @if (misiones().length === 0) {
          <div class="empty-state" id="empty-misiones">
            No hay misiones registradas en tu bitácora. ¡Añade una misión para comenzar!
          </div>
        } @else {
          <div class="wiki-card-grid">
            @for (mision of misiones(); track mision.id) {
              <p-card
                [subheader]="'Dificultad: ' + mision.dificultad"
                [attr.id]="'mision-' + mision.id"
                [class.mision-completada]="mision.completada"
                appHighlight
              >
                <ng-template pTemplate="title">
                  <div class="mision-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="mision-title" [style.textDecoration]="mision.completada ? 'line-through' : 'none'" [style.color]="mision.completada ? '#888' : '#fff'">{{ mision.titulo }}</span>
                    <p-tag
                      [severity]="mision.completada ? 'success' : getDificultadSeverity(mision.dificultad)"
                      [value]="mision.completada ? 'Completada' : mision.dificultad"
                    ></p-tag>
                  </div>
                </ng-template>

                <p class="mision-desc" [style.color]="mision.completada ? '#666' : '#c9d4e3'">{{ mision.objetivo }}</p>

                <div class="wiki-actions">
                  <button
                    pButton
                    type="button"
                    [icon]="mision.completada ? 'pi pi-undo' : 'pi pi-check-circle'"
                    [label]="mision.completada ? 'Reabrir' : 'Completar'"
                    [severity]="mision.completada ? 'secondary' : 'success'"
                    (click)="toggleCompletada(mision.id)"
                    [attr.id]="'btn-complete-' + mision.id"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-pencil"
                    label="Editar"
                    severity="info"
                    (click)="startEdit(mision)"
                    [disabled]="mision.completada"
                    [attr.id]="'btn-edit-' + mision.id"
                  ></button>
                  <button
                    pButton
                    type="button"
                    icon="pi pi-trash"
                    label="Eliminar"
                    severity="danger"
                    (click)="deleteMision(mision.id)"
                    [attr.id]="'btn-delete-' + mision.id"
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
export class TareasPage implements OnInit {
  protected misiones = signal<Mision[]>([]);

  // Campos de formulario
  protected formTitulo = '';
  protected formObjetivo = '';
  protected formDificultad: 'Baja' | 'Media' | 'Alta' = 'Baja';

  // Estados de edición y validación
  protected editingId = signal<number | null>(null);
  protected errorTitulo = signal<string | null>(null);
  protected errorObjetivo = signal<string | null>(null);
  protected isFormValid = signal(false);

  // Estadísticas computadas
  protected activeCount = computed(() => this.misiones().filter(m => !m.completada).length);
  protected completedCount = computed(() => this.misiones().filter(m => m.completada).length);
  protected completionRate = computed(() => {
    const total = this.misiones().length;
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  ngOnInit() {
    this.loadMisiones();
    this.validateForm();
  }

  protected loadMisiones() {
    const local = localStorage.getItem('aegis_misiones');
    if (local) {
      try {
        this.misiones.set(JSON.parse(local));
      } catch {
        this.loadDefaultMisiones();
      }
    } else {
      this.loadDefaultMisiones();
    }
  }

  private loadDefaultMisiones() {
    const defaults: Mision[] = [
      {
        id: 1,
        titulo: 'Reclamar la Gran Runa de Godrick',
        objetivo: 'Entrar al Castillo Velo Tormentoso y derrotar al Semidiós Godrick el Injertado para obtener su Gran Runa.',
        dificultad: 'Media',
        completada: false
      },
      {
        id: 2,
        titulo: 'Hablar con Melina en el Necrolimbo',
        objetivo: 'Aceptar el acuerdo de Melina en una Gracia perdida para desbloquear el corcel espiritual Torrentera.',
        dificultad: 'Baja',
        completada: true
      }
    ];
    this.misiones.set(defaults);
    this.saveMisiones();
  }

  protected saveMisiones() {
    localStorage.setItem('aegis_misiones', JSON.stringify(this.misiones()));
  }

  protected validateForm() {
    let valid = true;

    // Validación del Título
    if (!this.formTitulo.trim()) {
      this.errorTitulo.set('El título de la misión es requerido.');
      valid = false;
    } else if (this.formTitulo.trim().length < 4) {
      this.errorTitulo.set('El título debe tener al menos 4 caracteres.');
      valid = false;
    } else {
      this.errorTitulo.set(null);
    }

    // Validación del Objetivo
    if (!this.formObjetivo.trim()) {
      this.errorObjetivo.set('El objetivo de la misión es requerido.');
      valid = false;
    } else if (this.formObjetivo.trim().length < 10) {
      this.errorObjetivo.set('La descripción debe tener al menos 10 caracteres.');
      valid = false;
    } else {
      this.errorObjetivo.set(null);
    }

    this.isFormValid.set(valid);
  }

  protected submitForm() {
    this.validateForm();
    if (!this.isFormValid()) return;

    const currentId = this.editingId();
    if (currentId !== null) {
      // Modificar elemento del DOM (actualizar datos)
      this.misiones.update(list => list.map(m => m.id === currentId ? {
        ...m,
        titulo: this.formTitulo.trim(),
        objetivo: this.formObjetivo.trim(),
        dificultad: this.formDificultad
      } : m));
      this.editingId.set(null);
    } else {
      // Crear nuevo elemento en la interfaz (DOM dinámico)
      const nueva: Mision = {
        id: Date.now(),
        titulo: this.formTitulo.trim(),
        objetivo: this.formObjetivo.trim(),
        dificultad: this.formDificultad,
        completada: false
      };
      this.misiones.update(list => [...list, nueva]);
    }

    this.resetFormFields();
    this.saveMisiones();
  }

  protected startEdit(mision: Mision) {
    this.editingId.set(mision.id);
    this.formTitulo = mision.titulo;
    this.formObjetivo = mision.objetivo;
    this.formDificultad = mision.dificultad;
    this.validateForm();
  }

  protected cancelEdit() {
    this.editingId.set(null);
    this.resetFormFields();
  }

  protected deleteMision(id: number) {
    // Eliminar elemento del DOM dinámicamente
    this.misiones.update(list => list.filter(m => m.id !== id));
    if (this.editingId() === id) {
      this.editingId.set(null);
      this.resetFormFields();
    }
    this.saveMisiones();
  }

  protected toggleCompletada(id: number) {
    // Actualizar elemento en tiempo real
    this.misiones.update(list => list.map(m => m.id === id ? { ...m, completada: !m.completada } : m));
    this.saveMisiones();
  }

  private resetFormFields() {
    this.formTitulo = '';
    this.formObjetivo = '';
    this.formDificultad = 'Baja';
    this.errorTitulo.set(null);
    this.errorObjetivo.set(null);
    this.isFormValid.set(false);
  }

  protected getDificultadSeverity(dificultad: 'Baja' | 'Media' | 'Alta'): 'info' | 'warn' | 'danger' {
    if (dificultad === 'Baja') return 'info';
    if (dificultad === 'Media') return 'warn';
    return 'danger';
  }
}
