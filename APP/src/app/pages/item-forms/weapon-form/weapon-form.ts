import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

@Component({
  selector: 'app-weapon-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weapon-form.html',
  styleUrl: './weapon-form.css',
})
export class WeaponForm implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly router = inject(Router);

  isSubmitting = signal(false);
  error = signal<string | null>(null);

  formData = signal<Partial<Item>>({
    name: '',
    desc: [],
    cost: { quantity: 0, unit: 'gp' },
    weight: 0,
    weapon_category: '',
    weapon_range: 'Melee',
    damage: { damage_dice: '1d4' },
    range: { normal: 5, long: 0 },
    properties: [],
  });

  // Weapon categories
  weaponCategories = ['Simple', 'Martial'];

  // Weapon ranges
  weaponRanges = ['Melee', 'Ranged'];

  // Damage dice options
  damageDice = ['1d4', '1d6', '1d8', '1d10', '1d12', '2d6', '2d8', '2d10', '2d12', '3d6', '3d8', '4d6', '4d8', '6d6', '8d6'];

  // Cost units
  costUnits = ['cp', 'sp', 'ep', 'gp', 'pp'];

  ngOnInit(): void {}

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const data: Partial<Item> = {
        ...this.formData(),
        equipment_category: {
          index: 'weapon',
          name: 'Weapon',
          url: '/api/2014/equipment-categories/weapon',
        },
      };

      await this.itemsService.create(data, 'weapon');

      this.router.navigate(['/manual'], {
        queryParams: { section: 'items' },
      });
    } catch (err) {
      console.error('Error creating weapon:', err);
      this.error.set('Error creating weapon. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/manual'], {
      queryParams: { section: 'items' },
    });
  }
}