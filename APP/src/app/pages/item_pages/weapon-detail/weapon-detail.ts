import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Weapon } from '../../../interfaces/items/weapon';

@Component({
  selector: 'app-weapon-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './weapon-detail.html',
  styleUrl: './weapon-detail.css',
})
export class WeaponDetailComponent {
  @Input() weapon!: Weapon;

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_IMAGES}${imagePath}`;
  }
}