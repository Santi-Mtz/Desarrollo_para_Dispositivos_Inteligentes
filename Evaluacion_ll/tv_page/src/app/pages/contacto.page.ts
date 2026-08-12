import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-contacto-page',
  standalone: true,
  imports: [ReactiveFormsModule, CardModule, ButtonModule, TagModule, InputTextModule, MessageModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Contacto</h3>
        <p>Canales directos para errores, sugerencias y mejoras de contenido.</p>
      </div>

      <p-card header="Datos de contacto" subheader="Información principal">
        <div class="wiki-card-grid">
          <p-card subheader="Soporte">
            <ng-template pTemplate="title">Email</ng-template>
            <p>soporte@aegis-wiki.com</p>
            <p-tag severity="info" value="Respuesta estimada: 48h"></p-tag>
          </p-card>

          <p-card subheader="Comunidad">
            <ng-template pTemplate="title">Redes sociales</ng-template>
            <div class="wiki-actions">
              <button pButton type="button" icon="pi pi-discord" label="Discord" severity="secondary"></button>
              <button pButton type="button" icon="pi pi-youtube" label="YouTube" severity="secondary"></button>
              <button pButton type="button" icon="pi pi-instagram" label="Instagram" severity="secondary"></button>
            </div>
          </p-card>

          <p-card subheader="Ubicación referencial">
            <ng-template pTemplate="title">Dirección</ng-template>
            <p>Limgrave Plaza, Sector Comunidad, Lands Between</p>
            <p>Horario: Lunes a Viernes · 10:00 a 18:00</p>
          </p-card>
        </div>
      </p-card>

      <p-card header="Formulario de contacto" subheader="Envíanos tu mensaje">
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <label for="nombre">Nombre</label>
          <input id="nombre" pInputText type="text" formControlName="nombre" placeholder="Tu nombre" />
          @if (form.controls.nombre.invalid && form.controls.nombre.touched) {
            <small class="field-error">Ingresa un nombre de al menos 2 caracteres.</small>
          }

          <label for="correo">Correo</label>
          <input id="correo" pInputText type="email" formControlName="correo" placeholder="correo@ejemplo.com" />
          @if (form.controls.correo.invalid && form.controls.correo.touched) {
            <small class="field-error">Ingresa un correo válido.</small>
          }

          <label for="mensaje">Mensaje</label>
          <textarea id="mensaje" rows="4" formControlName="mensaje" placeholder="Cuéntanos tu propuesta o reporte"></textarea>
          @if (form.controls.mensaje.invalid && form.controls.mensaje.touched) {
            <small class="field-error">El mensaje debe tener al menos 10 caracteres.</small>
          }

          @if (successMessage()) {
            <p-message severity="success" [text]="successMessage() ?? ''"></p-message>
          }

          <div class="wiki-actions">
            <button pButton type="submit" icon="pi pi-send" label="Enviar mensaje"></button>
            <button pButton type="button" icon="pi pi-eraser" label="Limpiar" severity="secondary" (click)="clear()"></button>
          </div>
        </form>
      </p-card>
    </section>
  `
})
export class ContactoPage {
  private readonly fb = inject(FormBuilder);

  protected readonly successMessage = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    mensaje: ['', [Validators.required, Validators.minLength(10)]]
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.successMessage.set('Mensaje enviado correctamente. Te responderemos pronto.');
    this.form.reset({ nombre: '', correo: '', mensaje: '' });
  }

  protected clear(): void {
    this.successMessage.set(null);
    this.form.reset({ nombre: '', correo: '', mensaje: '' });
  }
}
