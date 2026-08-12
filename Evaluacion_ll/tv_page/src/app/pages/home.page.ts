import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, CardModule, TagModule, ButtonModule],
  template: `
    <section class="page-section">
      <div class="section-intro">
        <h3>Panel principal</h3>
        <p>Tu ruta por las Tierras Intermedias empieza aqui.</p>
      </div>

      <p-card subheader="Guia comunitaria para avanzar con confianza">
        <div class="home-simple">
          <div class="home-simple-main">
            <h4>Bienvenido, Sinluz</h4>
            <p>
              Explora equipo, compara builds y avanza con una ruta clara sin complicaciones.
            </p>

            <div class="quick-actions">
              <a pButton routerLink="/armas" icon="pi pi-arrow-right" label="Explorar armas"></a>
              <a pButton routerLink="/builds" icon="pi pi-compass" label="Ver builds" severity="secondary"></a>
              <a pButton routerLink="/mapa" icon="pi pi-map" label="Abrir mapa" severity="contrast"></a>
            </div>

            <div class="home-highlights">
              <p-tag severity="warn" value="Base en expansion"></p-tag>
              <p-tag severity="info" value="Builds iniciales"></p-tag>
              <p-tag severity="success" value="Apto para nuevos jugadores"></p-tag>
            </div>
          </div>

          <div class="home-simple-side">
            <img src="/assets/Logo/logo_provisional.jpg" alt="Insignia AEGIS Wiki" />
            <div class="home-simple-stats">
              <div class="stat-item">
                <i class="pi pi-sitemap"></i>
                <span>8 secciones</span>
              </div>
              <div class="stat-item">
                <i class="pi pi-cog"></i>
                <span>12 builds</span>
              </div>
              <div class="stat-item">
                <i class="pi pi-sync"></i>
                <span>Actualización en vivo</span>
              </div>
            </div>
          </div>
        </div>
      </p-card>
    </section>
  `,
  styles: [`
    .home-simple {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(260px, 340px);
      gap: 20px;
      align-items: stretch;
    }
    .home-simple-main {
      padding: 24px;
      border: 1px solid #2f4055;
      border-radius: 16px;
      background: linear-gradient(145deg, rgba(20, 30, 45, 0.8), rgba(15, 20, 30, 0.9));
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 20px;
      height: 100%;
    }
    .home-simple-main h4 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
      color: #ffffff;
    }
    .home-simple-main p {
      margin: 0;
      color: #c9d4e3;
      line-height: 1.6;
      font-size: 1.05rem;
    }
    .quick-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 10px 0;
    }
    .home-highlights {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .home-simple-side {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px;
      border: 1px solid #2f4055;
      border-radius: 16px;
      background: linear-gradient(145deg, rgba(20, 30, 45, 0.8), rgba(15, 20, 30, 0.9));
      align-items: center;
      justify-content: center;
    }
    .home-simple-side img {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      border: 2px solid #caa551;
      padding: 4px;
      background: rgba(15, 20, 30, 0.8);
      object-fit: cover;
      box-shadow: 0 8px 20px rgba(0,0,0,0.4);
    }
    .home-simple-stats {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(19, 29, 41, 0.6);
      border: 1px solid #304457;
      border-radius: 10px;
      color: #d0ddf0;
      transition: all 0.2s ease-in-out;
    }
    .stat-item:hover {
      background: rgba(26, 38, 57, 0.8);
      border-color: #caa551;
      transform: translateY(-2px);
    }
    .stat-item i {
      color: #caa551;
      font-size: 1.15rem;
    }
    .stat-item span {
      font-size: 0.92rem;
      font-weight: 600;
    }
    @media (max-width: 992px) {
      .home-simple {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomePage {}
