import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Mount } from '../../../interfaces/items/mount';

@Component({
  selector: 'app-mount-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mount-detail.html',
  styleUrl: './mount-detail.css',
})
export class MountDetailComponent {
  @Input() mount!: Mount;
}