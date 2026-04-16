import { Component, OnInit, inject, signal } from '@angular/core';
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

  races = signal<Race[]>([]);
  private raceIndexSet = new Set<string>();
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      await this.racesService.getRaces((item) => {
        if (this.raceIndexSet.has(item.index)) {
          return;
        }

        this.raceIndexSet.add(item.index);
        this.races.update((current) => [...current, item].sort((a, b) => a.name.localeCompare(b.name)));
        this.loading.set(false);
      });
    } catch (error) {
      console.error('Error loading races:', error);
      this.error.set('No se han podido cargar las razas.');
    } finally {
      if (!this.error()) {
        this.loading.set(false);
      }
      this.raceIndexSet.clear();
    }
  }
}
