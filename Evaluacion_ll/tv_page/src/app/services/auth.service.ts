import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

type AuthResponse = {
  message: string;
  user?: SessionUser;
  mfaRequired?: boolean;
  mfaToken?: string;
  token?: string;
};

type MfaSetupStartResponse = {
  message: string;
  qrImageDataUrl: string;
  otpAuthUrl: string;
};

type MfaStateResponse = {
  message?: string;
  mfaEnabled: boolean;
};

export type SessionUser = {
  id: number;
  nombre: string;
  email: string;
  role: 'admin' | 'user';
  mfaEnabled?: boolean;
  token?: string;
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'aegis_user';
  private readonly currentUserSignal = signal<SessionUser | null>(this.readStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  constructor(private readonly http: HttpClient) {
    globalThis.window?.addEventListener('storage', this.syncFromStorage);
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', payload).pipe(
      tap((response) => {
        if (response.user) {
          this.setUser({ ...response.user, token: response.token });
        }
      })
    );
  }

  verifyMfaLogin(payload: { mfaToken: string; code: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/mfa/login/verify', payload).pipe(
      tap((response) => {
        if (response.user) {
          this.setUser({ ...response.user, token: response.token });
        }
      })
    );
  }

  getMfaStatus(userId: number): Observable<MfaStateResponse> {
    return this.http.get<MfaStateResponse>(`/api/auth/mfa/status/${userId}`).pipe(
      tap((response) => {
        const current = this.currentUserSignal();
        if (current?.id === userId) {
          this.setUser({ ...current, mfaEnabled: response.mfaEnabled });
        }
      })
    );
  }

  startMfaSetup(userId: number): Observable<MfaSetupStartResponse> {
    return this.http.post<MfaSetupStartResponse>('/api/auth/mfa/setup/start', { userId });
  }

  confirmMfaSetup(payload: { userId: number; code: string }): Observable<MfaStateResponse> {
    return this.http.post<MfaStateResponse>('/api/auth/mfa/setup/confirm', payload).pipe(
      tap((response) => {
        const current = this.currentUserSignal();
        if (current?.id === payload.userId) {
          this.setUser({ ...current, mfaEnabled: response.mfaEnabled });
        }
      })
    );
  }

  disableMfa(payload: { userId: number; code: string }): Observable<MfaStateResponse> {
    return this.http.post<MfaStateResponse>('/api/auth/mfa/disable', payload).pipe(
      tap((response) => {
        const current = this.currentUserSignal();
        if (current?.id === payload.userId) {
          this.setUser({ ...current, mfaEnabled: response.mfaEnabled });
        }
      })
    );
  }

  register(payload: { nombre: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', payload).pipe(
      tap((response) => {
        if (response.user) {
          this.setUser({ ...response.user, token: response.token });
        }
      })
    );
  }

  logout(): void {
    const user = this.currentUserSignal();
    if (user?.email) {
      this.http.post('/api/auth/logout', { email: user.email }).subscribe({
        error: (err) => console.error('Error al registrar cierre de sesión en backend:', err)
      });
    }
    localStorage.removeItem(this.storageKey);
    this.currentUserSignal.set(null);
  }

  updateProfile(payload: { id: number; nombre: string; email: string }): Observable<any> {
    return this.http.put('/api/auth/profile', payload).pipe(
      tap(() => {
        const current = this.currentUserSignal();
        if (current && current.id === payload.id) {
          this.setUser({ ...current, nombre: payload.nombre });
        }
      })
    );
  }

  changePassword(payload: { id: number; email: string; oldPassword: string; newPassword: string }): Observable<any> {
    return this.http.put('/api/auth/password', payload);
  }

  private getAdminHeaders() {
    const current = this.currentUserSignal();
    return {
      'Authorization': current?.token ? `Bearer ${current.token}` : '',
      'x-user-role': current?.role || '',
      'x-user-email': current?.email || ''
    };
  }

  getAdminUsers(): Observable<any[]> {
    return this.http.get<any[]>('/api/admin/usuarios', { headers: this.getAdminHeaders() });
  }

  createAdminUser(payload: any): Observable<any> {
    return this.http.post('/api/admin/usuarios', payload, { headers: this.getAdminHeaders() });
  }

  updateAdminUser(id: number, payload: any): Observable<any> {
    return this.http.put(`/api/admin/usuarios/${id}`, payload, { headers: this.getAdminHeaders() });
  }

  deleteAdminUser(id: number): Observable<any> {
    return this.http.delete(`/api/admin/usuarios/${id}`, { headers: this.getAdminHeaders() });
  }

  resetAdminUserPassword(id: number, payload: any): Observable<any> {
    return this.http.put(`/api/admin/usuarios/${id}/password`, payload, { headers: this.getAdminHeaders() });
  }

  getAuditLogs(): Observable<any[]> {
    return this.http.get<any[]>('/api/admin/bitacora', { headers: this.getAdminHeaders() });
  }

  private setUser(user: SessionUser): void {
    const normalizedUser: SessionUser = {
      ...user,
      role: user.role ?? 'user'
    };
    localStorage.setItem(this.storageKey, JSON.stringify(normalizedUser));
    this.currentUserSignal.set(normalizedUser);
  }

  private readonly syncFromStorage = (): void => {
    this.currentUserSignal.set(this.readStoredUser());
  };

  private readStoredUser(): SessionUser | null {
    const rawUser = localStorage.getItem(this.storageKey);
    if (!rawUser) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawUser) as SessionUser;
      if (!parsed?.email || !parsed?.nombre || typeof parsed.id !== 'number') {
        return null;
      }

      return {
        id: parsed.id,
        nombre: parsed.nombre,
        email: parsed.email,
        role: parsed.role === 'admin' ? 'admin' : 'user',
        mfaEnabled: Boolean(parsed.mfaEnabled),
        token: parsed.token
      };
    } catch {
      return null;
    }
  }
}
