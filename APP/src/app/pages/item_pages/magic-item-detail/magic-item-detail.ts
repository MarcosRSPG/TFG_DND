import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { MagicItem } from '../../../interfaces/items/magic-item';

@Component({
  selector: 'app-magic-item-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './magic-item-detail.html',
  styleUrl: './magic-item-detail.css',
})
export class MagicItemDetailComponent {
  @Input() magicItem!: MagicItem;

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_URL}${imagePath}`;
  }
}