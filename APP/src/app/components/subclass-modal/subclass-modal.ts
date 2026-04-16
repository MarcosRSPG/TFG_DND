import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LeveledFeature } from '../../interfaces/class';
import { Subclass } from '../../interfaces/subclass';

@Component({
  selector: 'app-subclass-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subclass-modal.html',
  styleUrl: './subclass-modal.css',
})
export class SubclassModalComponent {
  @Input() subclass!: Subclass;
  @Input() features: LeveledFeature[] = [];
  @Output() onClose = new EventEmitter<void>();

  closeModal(): void {
    this.onClose.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}