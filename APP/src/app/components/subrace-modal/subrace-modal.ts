import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subrace, Trait } from '../../interfaces/subrace';
import { RaceTraitDetail } from '../../interfaces/race';

@Component({
  selector: 'app-subrace-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subrace-modal.html',
  styleUrl: './subrace-modal.css',
})
export class SubraceModalComponent {
  @Input() subrace!: Subrace;
  @Input() traitDetails: Record<string, RaceTraitDetail> = {};
  @Output() onClose = new EventEmitter<void>();

  closeModal(): void {
    this.onClose.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  getTraitDescriptions(trait: Trait): string[] {
    return this.traitDetails[trait.index]?.desc ?? [];
  }
}
