import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Tool } from '../../../interfaces/items/tool';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tool-detail.html',
  styleUrl: './tool-detail.css',
})
export class ToolDetailComponent {
  @Input() tool!: Tool;
}