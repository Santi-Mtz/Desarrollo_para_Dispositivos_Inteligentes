import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule
  ],
  template: `
    <section class="page-section auth-wrap">
      <p-card header="Iniciar sesión" subheader="Accede a tu cuenta de AEGIS Wiki">
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          @if (!mfaRequired()) {
            <label for="email">Correo</label>
            <input id="email" pInputText type="email" formControlName="email" placeholder="correo@ejemplo.com" />

            <label for="password">Contraseña</label>
            <p-password
              inputId="password"
              formControlName="password"
              [toggleMask]="true"
              [feedback]="false"
              placeholder="Tu contraseña"
            ></p-password>
          } @else {
            <p-message severity="info" text="Verificación en dos pasos: ingresa el código de Microsoft Authenticator."></p-message>

            <label for="mfa-code">Código de verificación</label>
            <input
              id="mfa-code"
              pInputText
              type="text"
              inputmode="numeric"
              maxlength="6"
              [ngModel]="mfaCode()"
              (ngModelChange)="mfaCode.set($event)"
              [ngModelOptions]="{ standalone: true }"
              placeholder="123456"
            />
          }

          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage() ?? ''"></p-message>
          }

          @if (successMessage()) {
            <p-message severity="success" [text]="successMessage() ?? ''"></p-message>
          }

          <button
            pButton
            type="submit"
            [label]="mfaRequired() ? 'Verificar código' : 'Entrar'"
            [icon]="mfaRequired() ? 'pi pi-shield' : 'pi pi-sign-in'"
            [loading]="loading()"
          ></button>

          @if (mfaRequired()) {
            <button pButton type="button" label="Volver" icon="pi pi-arrow-left" severity="secondary" (click)="resetMfaStep()"></button>
          }

          <a class="auth-link" routerLink="/registro" [queryParams]="returnParams">¿No tienes cuenta? Regístrate</a>
        </form>
      </p-card>
    </section>
  `,
  styles: [`
    .auth-wrap {
      max-width: 480px;
      margin: 40px auto;
      padding: 0 16px;
    }
    .auth-form {
      display: flex !important;
      flex-direction: column !important;
      gap: 16px !important;
    }
    .auth-form label {
      font-weight: 600;
      color: #92a4b8;
      margin-bottom: -8px;
    }
    .auth-form input,
    .auth-form p-password {
      width: 100% !important;
    }
    .auth-form ::ng-deep .p-password-input {
      width: 100% !important;
    }
    .auth-form button {
      width: 100% !important;
      margin-top: 12px;
    }
    .auth-link {
      text-align: center;
      margin-top: 10px;
      display: block;
      color: #72a4f4;
      text-decoration: none;
    }
    .auth-link:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly mfaRequired = signal(false);
  protected readonly mfaToken = signal<string | null>(null);
  protected readonly mfaCode = signal('');
  protected readonly returnUrl = this.getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected submit(): void {
    if (this.mfaRequired()) {
      this.submitMfaCode();
      return;
    }

    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        if (response.mfaRequired && response.mfaToken) {
          this.mfaRequired.set(true);
          this.mfaToken.set(response.mfaToken);
          this.successMessage.set('Credenciales correctas. Ingresa el código de verificación.');
          this.loading.set(false);
          return;
        }

        this.successMessage.set(response.message || 'Inicio de sesión exitoso.');
        this.loading.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.message ?? 'No fue posible iniciar sesión.');
        this.loading.set(false);
      }
    });
  }

  protected resetMfaStep(): void {
    this.mfaRequired.set(false);
    this.mfaToken.set(null);
    this.mfaCode.set('');
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private submitMfaCode(): void {
    const token = this.mfaToken();
    const code = this.mfaCode().trim();
    if (!token || !/^\d{6}$/.test(code)) {
      this.errorMessage.set('Ingresa un código de 6 dígitos válido.');
      return;
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.verifyMfaLogin({ mfaToken: token, code }).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || 'Inicio de sesión exitoso.');
        this.loading.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err: any) => {
        this.errorMessage.set(err?.error?.message ?? 'No fue posible validar el código MFA.');
        this.loading.set(false);
      }
    });
  }

  protected get returnParams(): { returnUrl: string } | null {
    if (!this.returnUrl || this.returnUrl === '/') {
      return null;
    }

    return { returnUrl: this.returnUrl };
  }

  private getSafeReturnUrl(value: string | null): string {
    if (!value?.startsWith('/')) {
      return '/';
    }

    if (value.startsWith('//')) {
      return '/';
    }

    return value;
  }
}
