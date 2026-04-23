import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Item, ResourceReference } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

interface WeaponProperty {
  index: string;
  name: string;
}

interface DamageType {
  index: string;
  name: string;
}

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
    image: '',
    weapon_category: '',
    weapon_range: 'Melee',
    damage: { damage_dice: '1d4' },
    range: { normal: 5, long: 0 },
    properties: [],
    two_handed_damage: {},
  });

  // Weapon categories
  weaponCategories = ['Simple', 'Martial'];

  // Weapon ranges
  weaponRanges = ['Melee', 'Ranged'];

  // Damage dice options
  damageDice = ['1d4', '1d6', '1d8', '1d10', '1d12', '2d6', '2d8', '2d10', '2d12', '3d6', '3d8', '4d6', '4d8', '6d6', '8d6'];

  // Cost units
  costUnits = ['cp', 'sp', 'ep', 'gp', 'pp'];

  // Weapon properties from D&D API
  weaponProperties: WeaponProperty[] = [
    { index: 'ammunition', name: 'Ammunition' },
    { index: 'finesse', name: 'Finesse' },
    { index: 'heavy', name: 'Heavy' },
    { index: 'light', name: 'Light' },
    { index: 'loading', name: 'Loading' },
    { index: 'range', name: 'Range' },
    { index: 'reach', name: 'Reach' },
    { index: 'special', name: 'Special' },
    { index: 'thrown', name: 'Thrown' },
    { index: 'two-handed', name: 'Two-Handed' },
    { index: 'versatile', name: 'Versatile' },
  ];

  // Damage types from D&D API
  damageTypes: DamageType[] = [
    { index: 'slashing', name: 'Slashing' },
    { index: 'piercing', name: 'Piercing' },
    { index: 'bludgeoning', name: 'Bludgeoning' },
  ];

  // Selected properties
  selectedProperties = signal<string[]>([]);

  // Damage count for the dice formula (e.g., 2 for 2d6)
  damageCount = signal(1);

  // Two-handed damage count
  twoHandedDamageCount = signal(1);

  ngOnInit(): void {}

  toggleProperty(propertyIndex: string): void {
    const current = this.selectedProperties();
    if (current.includes(propertyIndex)) {
      this.selectedProperties.set(current.filter(p => p !== propertyIndex));
    } else {
      this.selectedProperties.set([...current, propertyIndex]);
    }
  }

  hasProperty(propertyIndex: string): boolean {
    return this.selectedProperties().includes(propertyIndex);
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Build properties array
      const properties = this.selectedProperties().map(index => {
        const prop = this.weaponProperties.find(p => p.index === index);
        return {
          index,
          name: prop?.name || index,
          url: `/api/2014/weapon-properties/${index}`
        };
      });

      // Build damage type reference
      const damageType = this.formData().damage?.damage_type || { index: '', name: '', url: '' };

      // Build damage dice formula: count + die (e.g., 2d6)
      const baseDie = this.formData().damage?.damage_dice?.replace(/^\d+/, '') || 'd6';
      const damageDice = `${this.damageCount()}${baseDie}`;

      // Build two-handed damage reference
      const twoHandedDamageType = this.formData().two_handed_damage?.damage_type || { index: '', name: '', url: '' };
      const twoHandedBaseDie = this.formData().two_handed_damage?.damage_dice?.replace(/^\d+/, '') || 'd8';
      const twoHandedDamageDice = `${this.twoHandedDamageCount()}${twoHandedBaseDie}`;

      const data: Partial<Item> = {
        ...this.formData(),
        equipment_category: {
          index: 'weapon',
          name: 'Weapon',
          url: '/api/2014/equipment-categories/weapon',
        },
        damage: {
          damage_dice: damageDice,
          damage_type: damageType,
        },
        two_handed_damage: {
          damage_dice: twoHandedDamageDice,
          damage_type: twoHandedDamageType,
        },
        properties,
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