import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-seguridad-page',
  standalone: true,
  imports: [FormsModule, RouterLink, CardModule, ButtonModule, InputTextModule, MessageModule, TagModule],
  template: `
    <section class="page-section auth-wrap">
      <p-card header="Seguridad de la cuenta" subheader="Verificación en 2 pasos (Microsoft Authenticator)">
        @if (errorMessage()) {
          <p-message severity="error" [text]="errorMessage() ?? ''"></p-message>
        }

        @if (successMessage()) {
          <p-message severity="success" [text]="successMessage() ?? ''"></p-message>
        }

        <div class="wiki-chip-row">
          <p-tag [severity]="mfaEnabled() ? 'success' : 'warn'" [value]="mfaEnabled() ? '2FA activo' : '2FA inactivo'"></p-tag>
        </div>

        @if (!mfaEnabled()) {
          <div class="auth-form">
            <p>Activa 2FA escaneando el QR con Microsoft Authenticator.</p>
            <button pButton type="button" icon="pi pi-qrcode" label="Generar QR" [loading]="loading()" (click)="startSetup()"></button>

            @if (qrImageDataUrl()) {
              <div class="mfa-qr-wrap">
                <img [src]="qrImageDataUrl() ?? ''" alt="QR para Microsoft Authenticator" />
              </div>

              <label for="setup-code">Código de 6 dígitos</label>
              <input
                id="setup-code"
                pInputText
                type="text"
                inputmode="numeric"
                maxlength="6"
                [(ngModel)]="setupCode"
                placeholder="123456"
              />

              <button pButton type="button" icon="pi pi-check" label="Confirmar activación" [loading]="loading()" (click)="confirmSetup()"></button>
            }
          </div>
        } @else {
          <div class="auth-form">
            <p>2FA está activo. Ingresa un código actual para desactivarlo.</p>

            <label for="disable-code">Código de verificación</label>
            <input
              id="disable-code"
              pInputText
              type="text"
              inputmode="numeric"
              maxlength="6"
              [(ngModel)]="disableCode"
              placeholder="123456"
            />

            <button pButton type="button" severity="danger" icon="pi pi-times" label="Desactivar 2FA" [loading]="loading()" (click)="disableMfa()"></button>
          </div>
        }

        <div class="wiki-actions">
          <a pButton routerLink="/vista-usuario" icon="pi pi-user" label="Mi perfil" severity="secondary"></a>
          <a pButton routerLink="/vista-admin" icon="pi pi-shield" label="Perfil admin" severity="contrast"></a>
        </div>
      </p-card>
    </section>
  `
})
export class SeguridadPage {
  private readonly authService = inject(AuthService);
  protected readonly currentUser = this.authService.currentUser;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly mfaEnabled = signal(Boolean(this.currentUser()?.mfaEnabled));
  protected readonly qrImageDataUrl = signal<string | null>(null);
  protected setupCode = '';
  protected disableCode = '';

  protected startSetup(): void {
    const userId = this.currentUser()?.id;
    if (!userId) {
      this.errorMessage.set('No hay sesión activa.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.startMfaSetup(userId).subscribe({
      next: (response) => {
        this.qrImageDataUrl.set(response.qrImageDataUrl);
        this.successMessage.set(response.message);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.message ?? 'No fue posible iniciar la configuración MFA.');
        this.loading.set(false);
      }
    });
  }

  protected confirmSetup(): void {
    const userId = this.currentUser()?.id;
    const code = this.setupCode.trim();
    if (!userId || !/^\d{6}$/.test(code)) {
      this.errorMessage.set('Ingresa un código válido de 6 dígitos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.confirmMfaSetup({ userId, code }).subscribe({
      next: (response) => {
        this.mfaEnabled.set(response.mfaEnabled);
        this.qrImageDataUrl.set(null);
        this.setupCode = '';
        this.successMessage.set(response.message ?? 'MFA activado correctamente.');
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.message ?? 'No fue posible confirmar MFA.');
        this.loading.set(false);
      }
    });
  }

  protected disableMfa(): void {
    const userId = this.currentUser()?.id;
    const code = this.disableCode.trim();
    if (!userId || !/^\d{6}$/.test(code)) {
      this.errorMessage.set('Ingresa un código válido de 6 dígitos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.disableMfa({ userId, code }).subscribe({
      next: (response) => {
        this.mfaEnabled.set(response.mfaEnabled);
        this.disableCode = '';
        this.successMessage.set(response.message ?? 'MFA desactivado.');
        this.loading.set(false);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.message ?? 'No fue posible desactivar MFA.');
        this.loading.set(false);
      }
    });
  }
}
