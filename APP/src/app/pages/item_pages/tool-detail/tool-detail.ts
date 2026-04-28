import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Tool } from '../../../interfaces/items/tool';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tool-detail.html',
  styleUrl: './tool-detail.css',
})
export class ToolDetailComponent {
  @Input() tool!: Tool;

  getImageUrl(imagePath: string | undefined): string {
    if (!imagePath) return '';
    return `${environment.API_URL}${imagePath}`;
  }
}