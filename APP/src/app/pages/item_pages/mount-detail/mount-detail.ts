import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Mount } from '../../../interfaces/items/mount';

@Component({
  selector: 'app-mount-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mount-detail.html',
  styleUrl: './mount-detail.css',
})
export class MountDetailComponent {
  @Input() mount!: Mount;

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_URL}${imagePath}`;
  }
}