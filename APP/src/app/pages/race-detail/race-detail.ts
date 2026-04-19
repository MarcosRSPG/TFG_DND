import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Race, RaceTrait, RaceTraitDetail } from '../../interfaces/race';
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
  private readonly router = inject(Router);

  race = signal<Race | null>(null);
  subraces = signal<Subrace[]>([]);
  traitDetails = signal<Record<string, RaceTraitDetail>>({});
  loading = signal(true);
  error = signal<string | null>(null);
  selectedSubrace = signal<Subrace | null>(null);
  showModal = signal(false);
  backQueryParams: Record<string, string> = {};

  async ngOnInit(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    this.backQueryParams = {
      section: queryParams.get('section') || 'races',
      searchName: queryParams.get('searchName') || '',
      size: queryParams.get('size') || '',
      page: queryParams.get('page') || '',
    };

    try {
      const index = this.route.snapshot.paramMap.get('index');
      if (!index) {
        throw new Error('No race index provided');
      }

      const raceData = await this.racesService.getRace(index);
      this.race.set(raceData);

      const subraceData = await this.racesService.getSubracesByRace(index);
      this.subraces.set(subraceData);

      // Load all trait details after both race and subraces are loaded
      await this.loadTraitDetails(raceData.traits);
    } catch (error) {
      console.error('Error loading race detail:', error);
      this.error.set('Failed to load race details.');
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

  getTraitDescriptions(trait: RaceTrait): string[] {
    return this.traitDetails()[trait.index]?.desc ?? [];
  }

  private async loadTraitDetails(traits: RaceTrait[]): Promise<void> {
    if (!traits.length && !this.subraces().length) {
      this.traitDetails.set({});
      return;
    }

    const allTraits: RaceTrait[] = [...traits];
    for (const subrace of this.subraces()) {
      allTraits.push(...(subrace.racial_traits ?? []));
    }

    const detailEntries = await Promise.all(
      allTraits.map(async (trait) => {
        try {
          const detail = await this.racesService.getTrait(trait.index);
          return [trait.index, detail] as const;
        } catch (error) {
          console.error(`Error loading trait ${trait.index}:`, error);
          return [trait.index, { index: trait.index, name: trait.name, desc: [], url: trait.url }] as const;
        }
      }),
    );

    this.traitDetails.set(Object.fromEntries(detailEntries));
  }

  get backParams(): Record<string, string> {
    const params: Record<string, string> = { section: this.backQueryParams['section'] || 'races' };
    if (this.backQueryParams['searchName']) params['searchName'] = this.backQueryParams['searchName'];
    if (this.backQueryParams['size']) params['size'] = this.backQueryParams['size'];
    if (this.backQueryParams['page']) params['page'] = this.backQueryParams['page'];
    return params;
  }
}
