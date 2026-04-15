import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Race } from '../../interfaces/race';
import { Subrace } from '../../interfaces/subrace';
import { RacesService } from '../../services/races-service';
import { SubraceModalComponent } from '../../components/subrace-modal/subrace-modal';

@Component({
  selector: 'app-race-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SubraceModalComponent],
  templateUrl: './race-detail.html',
  styleUrl: './race-detail.css',
})
export class RaceDetail implements OnInit {
  private readonly racesService = inject(RacesService);
  private readonly route = inject(ActivatedRoute);

  race = signal<Race | null>(null);
  subraces = signal<Subrace[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedSubrace = signal<Subrace | null>(null);
  showModal = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const index = this.route.snapshot.paramMap.get('index');
      if (!index) {
        throw new Error('No race index provided');
      }

      const raceData = await this.racesService.getRace(index);
      this.race.set(raceData);

      const subraceData = await this.racesService.getSubracesByRace(index);
      this.subraces.set(subraceData);
    } catch (error) {
      console.error('Error loading race detail:', error);
      this.error.set('No se ha podido cargar los detalles de la raza.');
    } finally {
      this.loading.set(false);
    }
  }

  openSubraceModal(subrace: Subrace): void {
    this.selectedSubrace.set(subrace);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedSubrace.set(null);
  }
}
