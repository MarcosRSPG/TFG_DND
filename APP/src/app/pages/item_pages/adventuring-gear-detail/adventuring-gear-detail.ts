import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AdventuringGear } from '../../../interfaces/items/adventuring-gear';

@Component({
  selector: 'app-adventuring-gear-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adventuring-gear-detail.html',
  styleUrl: './adventuring-gear-detail.css',
})
export class AdventuringGearDetailComponent {
  @Input() gear!: AdventuringGear;
}