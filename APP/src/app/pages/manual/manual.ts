import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Backgrounds } from '../../components/backgrounds/backgrounds';
import { Classes } from '../../components/classes/classes';
import { Items } from '../../components/items/items';
import { Monsters } from '../../components/monsters/monsters';
import { Races } from '../../components/races/races';
import { Spells } from '../../components/spells/spells';

interface ManualSection {
  id: string;
  label: string;
}

@Component({
  selector: 'app-manual',
  imports: [Races, Classes, Backgrounds, Spells, Monsters, Items],
  templateUrl: './manual.html',
  styleUrl: './manual.css',
})
export class Manual implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly sections: ManualSection[] = [
    { id: 'races', label: 'Races' },
    { id: 'clases', label: 'Clases' },
    { id: 'backgrounds', label: 'Backgrounds' },
    { id: 'spells', label: 'Spells' },
    { id: 'monsters', label: 'Monsters' },
    { id: 'items', label: 'Items' },
  ];

  selectedSectionId = this.sections[0].id;

  ngOnInit(): void {
    const section = this.route.snapshot.queryParamMap.get('section');
    if (section && this.sections.some(s => s.id === section)) {
      this.selectedSectionId = section;
    }
  }

  selectSection(sectionId: string): void {
    this.selectedSectionId = sectionId;
    this.updateUrl();
  }

  isSelected(sectionId: string): boolean {
    return this.selectedSectionId === sectionId;
  }

  getSelectedSection(): ManualSection | undefined {
    return this.sections.find(s => s.id === this.selectedSectionId);
  }

  private updateUrl(): void {
    this.router.navigate([], {
      queryParams: { section: this.selectedSectionId },
      queryParamsHandling: 'merge',
    });
    if (this.selectedSectionId !== 'items' && this.selectedSectionId !== 'races') {
      setTimeout(() => {
        this.router.navigate([], {
          queryParams: {
            searchName: null,
            types: null,
            source: null,
            costMin: null,
            costMax: null,
            size: null,
            page: null,
          },
        });
      }, 0);
    }
    if (this.selectedSectionId === 'items') {
      setTimeout(() => {
        this.router.navigate([], {
          queryParams: {
            size: null,
          },
        });
      }, 0);
    }
    if (this.selectedSectionId === 'races') {
      setTimeout(() => {
        this.router.navigate([], {
          queryParams: {
            searchName: null,
            types: null,
            source: null,
            costMin: null,
            costMax: null,
            page: null,
          },
        });
      }, 0);
    }
  }
}
