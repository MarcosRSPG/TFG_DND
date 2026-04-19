import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Weapon } from '../../../interfaces/items/weapon';

@Component({
  selector: 'app-weapon-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weapon-detail.html',
  styleUrl: './weapon-detail.css',
})
export class WeaponDetailComponent {
  @Input() weapon!: Weapon;
}