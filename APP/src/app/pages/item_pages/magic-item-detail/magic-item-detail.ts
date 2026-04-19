import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MagicItem } from '../../../interfaces/items/magic-item';

@Component({
  selector: 'app-magic-item-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './magic-item-detail.html',
  styleUrl: './magic-item-detail.css',
})
export class MagicItemDetailComponent {
  @Input() magicItem!: MagicItem;
}