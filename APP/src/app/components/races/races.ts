import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Race } from '../../interfaces/race';
import { RacesService } from '../../services/races-service';

@Component({
  selector: 'app-races',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './races.html',
  styleUrl: './races.css',
})
export class Races implements OnInit {
  private readonly racesService = inject(RacesService);

  races: Race[] = [];
  loading = true;
  error: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      this.races = await this.racesService.getRaces();
    } catch (error) {
      console.error('Error loading races:', error);
      this.error = 'No se han podido cargar las razas.';
    } finally {
      this.loading = false;
    }
  }
}
