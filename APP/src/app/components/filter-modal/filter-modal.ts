import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-modal.html',
  styleUrl: './filter-modal.css',
})
export class FilterModalComponent {
  @Input() title = 'Seleccionar opciones';
  @Input() options: string[] = [];
  @Input() selectedOptions: string[] = [];
  @Output() confirmed = new EventEmitter<string[]>();
  @Output() closed = new EventEmitter<void>();

  searchText = signal('');
  localSelected = signal<string[]>([]);
  isOpen = signal(false);

  open(): void {
    this.localSelected.set([...this.selectedOptions]);
    this.searchText.set('');
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  confirm(): void {
    this.confirmed.emit([...this.localSelected()]);
    this.close();
  }

  toggleOption(option: string): void {
    const current = this.localSelected();
    if (current.includes(option)) {
      this.localSelected.set(current.filter((o) => o !== option));
    } else {
      this.localSelected.set([...current, option]);
    }
  }

  get filteredOptions(): string[] {
    const search = this.searchText().toLowerCase();
    return this.options.filter((option) =>
      option.toLowerCase().includes(search)
    );
  }
}
