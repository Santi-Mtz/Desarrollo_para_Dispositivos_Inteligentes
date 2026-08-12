import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('App', () => {
  let httpClientSpy: jasmine.SpyObj<HttpClient>;
  let routerSpy: jasmine.SpyObj<Router>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl', 'parseUrl']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout']);

    // Configurar retornos mock
    httpClientSpy.get.and.returnValue(of([]));
    
    // Mocks de signals para AuthService
    const currentUserMock = signal<any>(null);
    const isAuthenticatedMock = signal<boolean>(false);
    
    authServiceSpy.currentUser = currentUserMock.asReadonly() as any;
    authServiceSpy.isAuthenticated = isAuthenticatedMock.asReadonly() as any;

    routerSpy.parseUrl.and.returnValue({ queryParams: {} } as any);
    Object.defineProperty(routerSpy, 'url', { get: () => '/' });
    Object.defineProperty(routerSpy, 'events', { get: () => of(null) });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: HttpClient, useValue: httpClientSpy },
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should filter wiki objects when search term matches', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    // Cargar datos simulados
    app['armas'].set([
      { id: 1, nombre: 'Espada de la Noche' },
      { id: 2, nombre: 'Velo Lunar' }
    ]);
    app['talismanes'].set([
      { id: 1, nombre: 'Icono de Radagon' }
    ]);

    // Establecer término de búsqueda
    app.search.set('velo');

    // Verificar filtros calculados
    const filtered = app['filteredWikiObjects']();
    expect(filtered.armas.length).toBe(1);
    expect(filtered.armas[0].nombre).toBe('Velo Lunar');
    expect(filtered.talismanes.length).toBe(0);
  });

  it('should compute first matching category correctly', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app['armas'].set([
      { id: 1, nombre: 'Espada de la Noche' }
    ]);

    app.search.set('espada');

    const firstMatch = app['firstMatchingCategory']();
    expect(firstMatch).toBeTruthy();
    expect(firstMatch?.key).toBe('armas');
    expect(firstMatch?.route).toBe('/armas');
  });

  it('should filter sidebar sections matching the search query', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.search.set('inicio');

    const filtered = app['filteredSections']();
    expect(filtered.length).toBe(1);
    expect(filtered[0].label).toBe('Inicio');
  });
});
