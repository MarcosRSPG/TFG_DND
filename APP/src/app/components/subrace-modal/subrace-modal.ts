import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subrace } from '../../interfaces/subrace';

@Component({
  selector: 'app-subrace-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subrace-modal.html',
  styleUrl: './subrace-modal.css',
})
export class SubraceModalComponent {
  @Input() subrace!: Subrace;
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
