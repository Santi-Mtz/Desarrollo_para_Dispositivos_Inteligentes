import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { userGuard } from './guards/user.guard';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
	{ path: 'mapa', loadComponent: () => import('./pages/mapa.page').then((m) => m.MapaPage) },
	{ path: 'wiki', canActivate: [authGuard], loadComponent: () => import('./pages/wiki.page').then((m) => m.WikiPage) },
	{ path: 'armas', canActivate: [authGuard], loadComponent: () => import('./pages/armas.page').then((m) => m.ArmasPage) },
	{ path: 'clases', canActivate: [authGuard], loadComponent: () => import('./pages/clases.page').then((m) => m.ClasesPage) },
	{ path: 'armaduras', canActivate: [authGuard], loadComponent: () => import('./pages/armaduras.page').then((m) => m.ArmadurasPage) },
	{ path: 'hechizos', canActivate: [authGuard], loadComponent: () => import('./pages/hechizos.page').then((m) => m.HechizosPage) },
	{ path: 'milagros', canActivate: [authGuard], loadComponent: () => import('./pages/milagros.page').then((m) => m.MilagrosPage) },
	{ path: 'talismanes', canActivate: [authGuard], loadComponent: () => import('./pages/talismanes.page').then((m) => m.TalismanesPage) },
	{ path: 'builds', canActivate: [authGuard], loadComponent: () => import('./pages/builds.page').then((m) => m.BuildsPage) },
	{ path: 'personajes', canActivate: [authGuard], loadComponent: () => import('./pages/personajes.page').then((m) => m.PersonajesPage) },
	{ path: 'terminos-de-uso', loadComponent: () => import('./pages/terminos-uso.page').then((m) => m.TerminosUsoPage) },
	{ path: 'quienes-somos', loadComponent: () => import('./pages/quienes-somos.page').then((m) => m.QuienesSomosPage) },
	{ path: 'servicios', loadComponent: () => import('./pages/servicios.page').then((m) => m.ServiciosPage) },
	{ path: 'contacto', loadComponent: () => import('./pages/contacto.page').then((m) => m.ContactoPage) },
	{ path: 'tareas', canActivate: [authGuard], loadComponent: () => import('./pages/tareas.page').then((m) => m.TareasPage) },
	{ path: 'vista-admin', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/vista-admin.page').then((m) => m.VistaAdminPage) },
	{ path: 'admin-usuarios', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/usuarios-admin.page').then((m) => m.UsuariosAdminPage) },
	{ path: 'tv', loadComponent: () => import('./pages/tv.page').then((m) => m.TvPage) },
	{ path: 'vista-usuario', canActivate: [authGuard, userGuard], loadComponent: () => import('./pages/vista-usuario.page').then((m) => m.VistaUsuarioPage) },
	{ path: 'seguridad', canActivate: [authGuard], loadComponent: () => import('./pages/seguridad.page').then((m) => m.SeguridadPage) },
	{ path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage) },
	{ path: 'registro', loadComponent: () => import('./pages/registro.page').then((m) => m.RegistroPage) },
	{ path: '**', redirectTo: '' }
];
