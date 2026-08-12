import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-vista-usuario-page',
  standalone: true,
  imports: [FormsModule, CardModule, TagModule, ButtonModule, InputTextModule, MessageModule, RouterLink],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Mi perfil</h3>
        <p>Gestiona tu cuenta, tus preferencias y tu ruta dentro de la wiki.</p>
      </div>

      @if (errorMessage()) {
        <p-message severity="error" [text]="errorMessage() ?? undefined"></p-message>
      }
      @if (successMessage()) {
        <p-message severity="success" [text]="successMessage() ?? undefined"></p-message>
      }

      <div class="wiki-card-grid">
        <!-- Resumen de Perfil -->
        <p-card header="Panel de perfil" subheader="Información de cuenta">
          <div class="profile-top">
            <div class="profile-identity">
              <div class="profile-avatar">{{ initials() }}</div>
              <div class="profile-details">
                <h4>{{ currentUser()?.nombre ?? 'Sin datos' }}</h4>
                <p>{{ currentUser()?.email ?? 'Sin datos' }}</p>
                <p-tag severity="info" [value]="'Rol: ' + (currentUser()?.role ?? 'user')"></p-tag>
              </div>
            </div>

            <div class="wiki-chip-row" style="margin-top: 15px;">
              <p-tag severity="success" value="Perfil activo"></p-tag>
              <p-tag severity="contrast" value="Sesión protegida"></p-tag>
            </div>
          </div>

          <div class="wiki-actions" style="margin-top: 30px;">
            <a pButton routerLink="/armas" icon="pi pi-arrow-right" label="Explorar armas"></a>
            <a pButton routerLink="/seguridad" icon="pi pi-shield" label="Configurar 2FA" severity="warn"></a>
            <a pButton routerLink="/contacto" icon="pi pi-envelope" label="Contactar soporte" severity="secondary"></a>
          </div>
        </p-card>

        <!-- Editar Datos Personales -->
        <p-card header="Editar Datos" subheader="Actualizar información básica">
          <div class="wiki-form-grid">
            <label class="wiki-form-wide">
              <span>Nombre Completo</span>
              <input pInputText type="text" [(ngModel)]="profileForm.nombre" />
            </label>
          </div>
          
          <div class="wiki-actions" style="margin-top: 20px;">
            <button pButton type="button" icon="pi pi-save" label="Guardar Datos" [loading]="loading()" (click)="saveProfile()"></button>
          </div>
        </p-card>
      </div>

      <div style="margin-top: 20px;">
        <!-- Cambiar Contraseña -->
        <p-card header="Seguridad de la Cuenta" subheader="Cambiar tu contraseña de acceso">
          <div class="wiki-form-grid">
            <label>
              <span>Contraseña Actual</span>
              <input pInputText type="password" [(ngModel)]="passwordForm.oldPassword" />
            </label>

            <label>
              <span>Nueva Contraseña</span>
              <input pInputText type="password" [(ngModel)]="passwordForm.newPassword" placeholder="Min. 8 caracteres, mayúscula, número y símbolo" />
            </label>

            <label>
              <span>Confirmar Nueva Contraseña</span>
              <input pInputText type="password" [(ngModel)]="passwordForm.confirmPassword" />
            </label>
          </div>

          <div class="wiki-actions" style="margin-top: 20px;">
            <button pButton type="button" icon="pi pi-lock-open" label="Actualizar Contraseña" severity="warn" [loading]="loading()" (click)="updatePassword()"></button>
          </div>
        </p-card>
      </div>
    </section>
  `
})
export class VistaUsuarioPage {
  private readonly authService = inject(AuthService);
  protected readonly currentUser = this.authService.currentUser;
  
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected profileForm = {
    nombre: this.currentUser()?.nombre ?? ''
  };

  protected passwordForm = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  protected readonly initials = computed(() => {
    const name = this.currentUser()?.nombre?.trim() ?? '';
    if (!name) {
      return 'US';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return `${first}${second}`.toUpperCase() || 'US';
  });

  protected saveProfile() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const userId = this.currentUser()?.id;
    const email = this.currentUser()?.email;
    const name = this.profileForm.nombre.trim();

    if (!userId || !email) {
      this.errorMessage.set('No hay una sesión activa.');
      return;
    }

    if (!name) {
      this.errorMessage.set('El nombre no puede estar vacío.');
      return;
    }

    this.loading.set(true);
    this.authService.updateProfile({ id: userId, nombre: name, email }).subscribe({
      next: () => {
        this.successMessage.set('Perfil actualizado exitosamente.');
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'No fue posible actualizar el perfil.');
        this.loading.set(false);
      }
    });
  }

  protected updatePassword() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const userId = this.currentUser()?.id;
    const email = this.currentUser()?.email;

    if (!userId || !email) {
      this.errorMessage.set('No hay una sesión activa.');
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = this.passwordForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      this.errorMessage.set('Todos los campos son obligatorios.');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.errorMessage.set('Las nuevas contraseñas no coinciden.');
      return;
    }

    // Validación de fuerza de contraseña en el frontend
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[\W_]/.test(newPassword);

    if (newPassword.length < 8 || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecial) {
      this.errorMessage.set('La nueva contraseña debe tener al menos 8 caracteres e incluir letras mayúsculas, minúsculas, números y caracteres especiales.');
      return;
    }

    this.loading.set(true);
    this.authService.changePassword({ id: userId, email, oldPassword, newPassword }).subscribe({
      next: () => {
        this.successMessage.set('Contraseña actualizada correctamente.');
        this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'No se pudo actualizar la contraseña.');
        this.loading.set(false);
      }
    });
  }
}

