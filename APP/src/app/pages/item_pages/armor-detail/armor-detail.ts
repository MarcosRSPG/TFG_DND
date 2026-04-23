import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Armor } from '../../../interfaces/items/armor';

@Component({
  selector: 'app-armor-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './armor-detail.html',
  styleUrl: './armor-detail.css',
})
export class ArmorDetailComponent {
  @Input() armor!: Armor;

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_IMAGES}${imagePath}`;
  }
}