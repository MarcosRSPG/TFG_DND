import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-viking-check',
  standalone: true,
  imports: [],
  templateUrl: './viking-check.html',
  styleUrl: './viking-check.css',
})
export class VikingCheck {
  @Input() checked = false;
  @Input() disabled = false;
  @Input() ariaLabel = 'Viking check';
  @Output() checkedChange = new EventEmitter<boolean>();

  onToggle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.checkedChange.emit(input.checked);
  }
}
