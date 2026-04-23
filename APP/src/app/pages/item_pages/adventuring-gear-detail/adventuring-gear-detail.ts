import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AdventuringGear } from '../../../interfaces/items/adventuring-gear';

@Component({
  selector: 'app-adventuring-gear-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './adventuring-gear-detail.html',
  styleUrl: './adventuring-gear-detail.css',
})
export class AdventuringGearDetailComponent {
  @Input() gear!: AdventuringGear;

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_IMAGES}${imagePath}`;
  }
}