import { Component } from '@angular/core';
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
export class Manual {
  readonly sections: ManualSection[] = [
    { id: 'razas', label: 'Razas' },
    { id: 'clases', label: 'Clases' },
    { id: 'backgrounds', label: 'Backgrounds' },
    { id: 'spells', label: 'Spells' },
    { id: 'monsters', label: 'Monsters' },
    { id: 'items', label: 'Items' },
  ];

  selectedSectionId = this.sections[0].id;

  selectSection(sectionId: string): void {
    this.selectedSectionId = sectionId;
  }

  isSelected(sectionId: string): boolean {
    return this.selectedSectionId === sectionId;
  }

  getSelectedSection(): ManualSection | undefined {
    return this.sections.find(s => s.id === this.selectedSectionId);
  }
}
