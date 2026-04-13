import { Component } from '@angular/core';
import { Races } from '../../components/races/races';

interface ManualSection {
  id: string;
  label: string;
}

@Component({
  selector: 'app-manual',
  imports: [Races],
  templateUrl: './manual.html',
  styleUrl: './manual.css',
})
export class Manual {
  readonly sections: ManualSection[] = [
    { id: 'razas', label: 'Razas' },
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
