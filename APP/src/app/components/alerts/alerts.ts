import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AlertVariant = 'info' | 'success' | 'error';

@Component({
  selector: 'app-alerts',
  imports: [],
  templateUrl: './alerts.html',
  styleUrl: './alerts.css',
})
export class Alerts {
  @Input() isOpen = false;
  @Input() title = 'Notice';
  @Input() message = '';
  @Input() closeText = 'OK';
  @Input() variant: AlertVariant = 'info';
  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }
}
