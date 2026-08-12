import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registro-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule
  ],
  template: `
    <section class="page-section auth-wrap">
      <p-card header="Crear cuenta" subheader="Regístrate para guardar tu progreso y preferencias">
        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <label for="nombre">Nombre</label>
          <input id="nombre" pInputText type="text" formControlName="nombre" placeholder="Tu nombre" />

          <label for="email">Correo</label>
          <input id="email" pInputText type="email" formControlName="email" placeholder="correo@ejemplo.com" />

          <label for="password">Contraseña</label>
          <p-password
            inputId="password"
            formControlName="password"
            [toggleMask]="true"
            [feedback]="true"
            placeholder="Mínimo 6 caracteres"
          ></p-password>

          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage() ?? ''"></p-message>
          }

          @if (successMessage()) {
            <p-message severity="success" [text]="successMessage() ?? ''"></p-message>
          }

          <button pButton type="submit" label="Registrarme" icon="pi pi-user-plus" [loading]="loading()"></button>
          <a class="auth-link" routerLink="/login" [queryParams]="returnParams">¿Ya tienes cuenta? Inicia sesión</a>
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
export class RegistroPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly returnUrl = this.getSafeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService
      .register(this.form.getRawValue())
      .subscribe({
        next: (response) => {
          this.successMessage.set(response.message || 'Registro exitoso.');
          this.loading.set(false);
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'No fue posible completar el registro.');
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
    if (!value || !value.startsWith('/')) {
      return '/';
    }

    if (value.startsWith('//')) {
      return '/';
    }

    return value;
  }
}
