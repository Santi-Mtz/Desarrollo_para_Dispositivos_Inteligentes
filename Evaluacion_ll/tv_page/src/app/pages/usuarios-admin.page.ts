import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../services/auth.service';

interface UserItem {
  id: number;
  nombre: string;
  email: string;
  role: 'admin' | 'user';
  activo: boolean;
  permisos: string[];
}

interface AuditItem {
  id: number;
  usuario: string;
  fecha: string;
  hora: string;
  ip_address: string;
  accion: string;
}

@Component({
  selector: 'app-usuarios-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, TagModule, ButtonModule, InputTextModule, MessageModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Módulo de Administración de Usuarios</h3>
        <p>Administra cuentas de empleados, privilegios y audita el historial de seguridad.</p>
      </div>

      <!-- Navegación interna (Pestañas) -->
      <div class="wiki-actions" style="margin-bottom: 20px;">
        <button pButton type="button" 
          [label]="'Cuentas (' + users().length + ')'" 
          [icon]="'pi pi-users'"
          [severity]="activeTab() === 'cuentas' ? 'primary' : 'secondary'"
          (click)="activeTab.set('cuentas')">
        </button>
        <button pButton type="button" 
          label="Roles y Permisos" 
          icon="pi pi-shield"
          [severity]="activeTab() === 'roles' ? 'primary' : 'secondary'"
          (click)="activeTab.set('roles')">
        </button>
        <button pButton type="button" 
          label="Bitácora de Auditoría" 
          icon="pi pi-book"
          [severity]="activeTab() === 'bitacora' ? 'primary' : 'secondary'"
          (click)="activeTab.set('bitacora')">
        </button>
      </div>

      @if (errorMessage()) {
        <p-message severity="error" [text]="errorMessage() ?? undefined"></p-message>
      }
      @if (successMessage()) {
        <p-message severity="success" [text]="successMessage() ?? undefined"></p-message>
      }

      <!-- PESTAÑA DE CUENTAS -->
      @if (activeTab() === 'cuentas') {
        <div class="wiki-card-grid">
          <!-- Formulario Alta / Edición -->
          <p-card [header]="editingUser() ? 'Editar Usuario' : 'Nuevo Usuario'" subheader="Datos principales del empleado">
            <div class="wiki-form-grid">
              <label>
                <span>Nombre Completo</span>
                <input pInputText type="text" [(ngModel)]="userForm.nombre" placeholder="Ej. Juan Pérez" />
              </label>

              <label>
                <span>Correo Electrónico</span>
                <input pInputText type="email" [(ngModel)]="userForm.email" [disabled]="!!editingUser()" placeholder="juan@aegis.com" />
              </label>

              @if (!editingUser()) {
                <label>
                  <span>Contraseña Temporal</span>
                  <input pInputText type="password" [(ngModel)]="userForm.password" placeholder="Contraseña segura" />
                </label>
              }

              <label>
                <span>Rol Principal</span>
                <select [(ngModel)]="userForm.role" (change)="onRoleChange()">
                  <option value="user">Usuario Regular</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>

              <div class="wiki-form-wide">
                <span>Estado de Cuenta</span>
                <div style="display: flex; gap: 15px; margin-top: 5px;">
                  <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <input type="radio" [value]="true" [(ngModel)]="userForm.activo" />
                    <span>Activa</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <input type="radio" [value]="false" [(ngModel)]="userForm.activo" />
                    <span>Desactivada / Bloqueada</span>
                  </label>
                </div>
              </div>

              <!-- Permisos Asociados -->
              <div class="wiki-form-wide">
                <span>Permisos del Usuario</span>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 8px;">
                  @for (perm of availablePerms; track perm) {
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                      <input type="checkbox" 
                        [checked]="hasPermission(perm)" 
                        (change)="togglePermission(perm)" 
                      />
                      <span>{{ perm }}</span>
                    </label>
                  }
                </div>
              </div>
            </div>

            <div class="wiki-actions" style="margin-top: 20px;">
              <button pButton type="button" icon="pi pi-check" [label]="editingUser() ? 'Guardar Cambios' : 'Crear Usuario'" (click)="saveUser()"></button>
              <button pButton type="button" icon="pi pi-times" label="Limpiar" severity="secondary" (click)="resetUserForm()"></button>
            </div>
          </p-card>

          <!-- Listado de Usuarios -->
          <p-card header="Listado de Empleados" subheader="Control de accesos y eliminación lógica">
            <div class="wiki-actions" style="justify-content: flex-end; margin-bottom: 15px;">
              <button pButton type="button" icon="pi pi-sync" label="Recargar" severity="secondary" size="small" (click)="loadUsers()"></button>
            </div>

            <div class="wiki-list-grid">
              @for (u of users(); track u.id) {
                <div class="wiki-list-row" [style]="!u.activo ? { 'opacity': '0.6', 'background': '#1e293b' } : {}">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <strong>{{ u.nombre }}</strong>
                      <p-tag [severity]="u.activo ? 'success' : 'danger'" [value]="u.activo ? 'Activo' : 'Inactivo'"></p-tag>
                      <p-tag [severity]="u.role === 'admin' ? 'danger' : 'info'" [value]="u.role"></p-tag>
                    </div>
                    <small>{{ u.email }}</small>
                    <div style="margin-top: 4px;">
                      <small style="color: #94a3b8;">Permisos: {{ u.permisos.join(', ') || 'Ninguno' }}</small>
                    </div>
                  </div>
                  
                  <div class="wiki-actions" style="flex-shrink: 0;">
                    <button pButton type="button" icon="pi pi-pencil" label="Editar" severity="info" size="small" (click)="selectUserForEdit(u)"></button>
                    <button pButton type="button" icon="pi pi-key" label="Clave" severity="warn" size="small" (click)="selectUserForPassword(u)"></button>
                    @if (u.activo) {
                      <button pButton type="button" icon="pi pi-trash" label="Baja Lógica" severity="danger" size="small" (click)="deleteUser(u.id)"></button>
                    }
                  </div>
                </div>
              }
            </div>
          </p-card>
        </div>

        <!-- Formulario Desplegable para cambiar clave de un tercero -->
        @if (selectedResetUser()) {
          <div style="margin-top: 20px;">
            <p-card header="Restablecer Contraseña" [subheader]="'Establecer clave para: ' + selectedResetUser()?.nombre">
              <div class="wiki-form-grid">
                <label class="wiki-form-wide">
                  <span>Nueva Contraseña</span>
                  <input pInputText type="password" [(ngModel)]="newPassword" placeholder="Mínimo 8 caracteres, mayúscula, número y símbolo" />
                </label>
              </div>
              <div class="wiki-actions" style="margin-top: 15px;">
                <button pButton type="button" icon="pi pi-lock" label="Confirmar Cambio" severity="warn" (click)="confirmPasswordReset()"></button>
                <button pButton type="button" icon="pi pi-times" label="Cancelar" severity="secondary" (click)="selectedResetUser.set(null); newPassword = ''"></button>
              </div>
            </p-card>
          </div>
        }
      }

      <!-- PESTAÑA DE ROLES Y PERMISOS -->
      @if (activeTab() === 'roles') {
        <p-card header="Roles de Seguridad e Inteligencia de Privilegios" subheader="Rango de accesos según categoría de empleado">
          <div class="wiki-card-grid">
            <p-card subheader="Supervisión total y auditoría">
              <ng-template pTemplate="title">Administrador (Role: admin)</ng-template>
              <p>Tiene acceso absoluto a los listados del sitio web, creación/edición de contenido Wiki y gestión de cuentas.</p>
              <h5>Permisos predeterminados:</h5>
              <ul>
                <li><code>admin_users_view</code> (Ver usuarios)</li>
                <li><code>admin_users_edit</code> (Crear/Editar usuarios)</li>
                <li><code>admin_users_delete</code> (Baja lógica de cuentas)</li>
                <li><code>audit_logs_view</code> (Visualizar Bitácora de Auditoría)</li>
                <li><code>wiki_content_crud</code> (Crear, editar y eliminar armas/builds)</li>
              </ul>
            </p-card>

            <p-card subheader="Consulta y autogestión">
              <ng-template pTemplate="title">Usuario Regular (Role: user)</ng-template>
              <p>Perfil estándar de empleado. Únicamente puede consultar el contenido, configurar su cuenta y autogestionar su perfil.</p>
              <h5>Permisos predeterminados:</h5>
              <ul>
                <li><code>profile_view</code> (Ver perfil propio)</li>
                <li><code>profile_edit</code> (Modificar nombre e información de perfil)</li>
                <li><code>password_change</code> (Cambiar contraseña propia)</li>
                <li><code>wiki_content_view</code> (Visualizar base de datos de armas, armaduras, hechizos, etc.)</li>
              </ul>
            </p-card>
          </div>
        </p-card>
      }

      <!-- PESTAÑA DE BITÁCORA DE AUDITORÍA -->
      @if (activeTab() === 'bitacora') {
        <p-card header="Historial de Accesos y Acciones (Bitácora de Auditoría)" subheader="Registro seguro e inmutable de eventos del sistema">
          <div class="wiki-actions" style="justify-content: flex-end; margin-bottom: 15px;">
            <button pButton type="button" icon="pi pi-sync" label="Actualizar Bitácora" severity="secondary" size="small" (click)="loadAuditLogs()"></button>
          </div>

          <div style="overflow-x: auto; background: rgba(15, 23, 42, 0.4); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <table class="audit-table" style="width: 100%; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="border-bottom: 2px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3);">
                  <th style="padding: 12px 16px;">ID</th>
                  <th style="padding: 12px 16px;">Usuario</th>
                  <th style="padding: 12px 16px;">Fecha</th>
                  <th style="padding: 12px 16px;">Hora</th>
                  <th style="padding: 12px 16px;">Dirección IP</th>
                  <th style="padding: 12px 16px;">Acción Realizada</th>
                </tr>
              </thead>
              <tbody>
                @for (log of auditLogs(); track log.id) {
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);" class="audit-row">
                    <td style="padding: 10px 16px; color: #94a3b8;">{{ log.id }}</td>
                    <td style="padding: 10px 16px; font-weight: 600;">{{ log.usuario }}</td>
                    <td style="padding: 10px 16px; color: #cbd5e1;">{{ log.fecha }}</td>
                    <td style="padding: 10px 16px; color: #cbd5e1;">{{ log.hora }}</td>
                    <td style="padding: 10px 16px; font-family: monospace; color: #60a5fa;">{{ log.ip_address }}</td>
                    <td style="padding: 10px 16px;">
                      <span [style]="getActionStyle(log.accion)">{{ log.accion }}</span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8;">No hay registros de auditoría disponibles.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </p-card>
      }
    </section>
  `,
  styles: [`
    .audit-table th, .audit-table td {
      border: none;
    }
    .audit-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
  `]
})
export class UsuariosAdminPage implements OnInit {
  private readonly authService = inject(AuthService);

  protected readonly activeTab = signal<'cuentas' | 'roles' | 'bitacora'>('cuentas');
  protected readonly users = signal<UserItem[]>([]);
  protected readonly auditLogs = signal<AuditItem[]>([]);
  protected readonly editingUser = signal<UserItem | null>(null);
  protected readonly selectedResetUser = signal<UserItem | null>(null);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly availablePerms = [
    'admin_users_view',
    'admin_users_edit',
    'admin_users_delete',
    'audit_logs_view',
    'wiki_content_crud',
    'profile_view',
    'profile_edit',
    'password_change',
    'wiki_content_view'
  ];

  protected userForm = {
    nombre: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    activo: true,
    permisos: [] as string[]
  };

  protected newPassword = '';

  ngOnInit() {
    this.loadUsers();
    this.loadAuditLogs();
  }

  protected loadUsers() {
    this.authService.getAdminUsers().subscribe({
      next: (data) => {
        this.users.set(data);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'No se pudieron cargar los usuarios.');
      }
    });
  }

  protected loadAuditLogs() {
    this.authService.getAuditLogs().subscribe({
      next: (data) => {
        this.auditLogs.set(data);
      },
      error: (err) => {
        console.error('Error al cargar la bitácora:', err);
      }
    });
  }

  protected hasPermission(perm: string): boolean {
    return this.userForm.permisos.includes(perm);
  }

  protected togglePermission(perm: string) {
    const idx = this.userForm.permisos.indexOf(perm);
    if (idx > -1) {
      this.userForm.permisos.splice(idx, 1);
    } else {
      this.userForm.permisos.push(perm);
    }
  }

  protected onRoleChange() {
    if (this.userForm.role === 'admin') {
      this.userForm.permisos = [
        'admin_users_view',
        'admin_users_edit',
        'admin_users_delete',
        'audit_logs_view',
        'wiki_content_crud',
        'profile_view',
        'profile_edit',
        'password_change',
        'wiki_content_view'
      ];
    } else {
      this.userForm.permisos = [
        'profile_view',
        'profile_edit',
        'password_change',
        'wiki_content_view'
      ];
    }
  }

  protected selectUserForEdit(user: UserItem) {
    this.editingUser.set(user);
    this.userForm.nombre = user.nombre;
    this.userForm.email = user.email;
    this.userForm.role = user.role;
    this.userForm.activo = user.activo;
    this.userForm.permisos = [...user.permisos];
    this.userForm.password = '';
  }

  protected selectUserForPassword(user: UserItem) {
    this.selectedResetUser.set(user);
    this.newPassword = '';
  }

  protected resetUserForm() {
    this.editingUser.set(null);
    this.userForm = {
      nombre: '',
      email: '',
      password: '',
      role: 'user',
      activo: true,
      permisos: ['profile_view', 'profile_edit', 'password_change', 'wiki_content_view']
    };
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  protected saveUser() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.userForm.nombre.trim() || !this.userForm.email.trim()) {
      this.errorMessage.set('El nombre y el correo son campos obligatorios.');
      return;
    }

    const editing = this.editingUser();
    if (editing) {
      const payload = {
        nombre: this.userForm.nombre,
        role: this.userForm.role,
        activo: this.userForm.activo,
        permisos: this.userForm.permisos
      };

      this.authService.updateAdminUser(editing.id, payload).subscribe({
        next: (res) => {
          this.successMessage.set(res.message || 'Usuario actualizado correctamente.');
          this.resetUserForm();
          this.loadUsers();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Error al actualizar usuario.');
        }
      });
    } else {
      if (!this.userForm.password.trim()) {
        this.errorMessage.set('La contraseña temporal es obligatoria.');
        return;
      }

      const payload = {
        nombre: this.userForm.nombre,
        email: this.userForm.email,
        password: this.userForm.password,
        role: this.userForm.role,
        permisos: this.userForm.permisos
      };

      this.authService.createAdminUser(payload).subscribe({
        next: (res) => {
          this.successMessage.set(res.message || 'Usuario creado correctamente.');
          this.resetUserForm();
          this.loadUsers();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message ?? 'Error al crear usuario.');
        }
      });
    }
  }

  protected deleteUser(id: number) {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.deleteAdminUser(id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Usuario dado de baja.');
        this.loadUsers();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'Error al eliminar usuario.');
      }
    });
  }

  protected confirmPasswordReset() {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const user = this.selectedResetUser();
    if (!user || !this.newPassword.trim()) {
      this.errorMessage.set('Completa el campo de contraseña.');
      return;
    }

    this.authService.resetAdminUserPassword(user.id, { newPassword: this.newPassword }).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Contraseña restablecida correctamente.');
        this.selectedResetUser.set(null);
        this.newPassword = '';
        this.loadAuditLogs();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message ?? 'No se pudo restablecer la contraseña.');
      }
    });
  }

  protected getActionStyle(accion: string): string {
    const act = accion.toLowerCase();
    if (act.includes('inicio de sesión')) return 'color: #4caf50; font-weight: 500;';
    if (act.includes('cierre de sesión')) return 'color: #94a3b8; font-weight: 500;';
    if (act.includes('bloqueo')) return 'color: #f44336; font-weight: bold;';
    if (act.includes('alta de usuario')) return 'color: #3b82f6; font-weight: 500;';
    if (act.includes('desactivado') || act.includes('eliminación')) return 'color: #f59e0b; font-weight: 500;';
    return '';
  }
}
