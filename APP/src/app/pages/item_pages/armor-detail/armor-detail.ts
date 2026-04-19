import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Armor } from '../../../interfaces/items/armor';

@Component({
  selector: 'app-armor-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './armor-detail.html',
  styleUrl: './armor-detail.css',
})
export class ArmorDetailComponent {
  @Input() armor!: Armor;
}