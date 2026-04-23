import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Item, ResourceReference } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

interface WeaponProperty {
  index: string;
  name: string;
  desc?: string;
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

  // Damage dice options - just the die type
  damageDice = ['d4', 'd6', 'd8', 'd10', 'd12'];

  // Cost units
  costUnits = ['cp', 'sp', 'ep', 'gp', 'pp'];

  // Weapon properties from D&D API (loaded in ngOnInit)
  weaponProperties: WeaponProperty[] = [];
  weaponPropertiesLoading = signal(true);

  // Property search for dropdown
  propertySearchQuery = signal('');
  showPropertiesDropdown = signal(false);

  // Selected property's description (for properties that need explanation)
  selectedPropertyDesc = signal<string | null>(null);

  // Extra field for 'special' property
  specialPropertyDesc = signal('');

  // Properties that show description when selected
  readonly propertiesWithDesc = ['finesse', 'heavy', 'light', 'reach', 'thrown', 'two-handed', 'versatile', 'ammunition', 'loading', 'monk'];

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

  ngOnInit(): void {
    this.loadWeaponProperties();
  }

  async loadWeaponProperties(): Promise<void> {
    this.weaponPropertiesLoading.set(true);
    try {
      const response = await fetch('https://www.dnd5eapi.co/api/2014/weapon-properties');
      const data = await response.json();
      
      // Load each property with its description
      const properties: WeaponProperty[] = [];
      for (const prop of data.results) {
        try {
          const detailRes = await fetch(`https://www.dnd5eapi.co${prop.url}`);
          const detail = await detailRes.json();
          properties.push({
            index: prop.index,
            name: prop.name,
            desc: detail.desc?.[0] || ''
          });
        } catch {
          properties.push({
            index: prop.index,
            name: prop.name,
            desc: ''
          });
        }
      }
      this.weaponProperties = properties;
    } catch (err) {
      console.error('Error loading weapon properties:', err);
      // Fallback to basic list
      this.weaponProperties = [
        { index: 'ammunition', name: 'Ammunition' },
        { index: 'finesse', name: 'Finesse' },
        { index: 'heavy', name: 'Heavy' },
        { index: 'light', name: 'Light' },
        { index: 'loading', name: 'Loading' },
        { index: 'monk', name: 'Monk' },
        { index: 'reach', name: 'Reach' },
        { index: 'special', name: 'Special' },
        { index: 'thrown', name: 'Thrown' },
        { index: 'two-handed', name: 'Two-Handed' },
        { index: 'versatile', name: 'Versatile' },
      ];
    } finally {
      this.weaponPropertiesLoading.set(false);
    }
  }

  // Filter properties based on search
  get filteredProperties(): WeaponProperty[] {
    const query = this.propertySearchQuery().toLowerCase();
    if (!query) return this.weaponProperties;
    return this.weaponProperties.filter(p =>
      p.name.toLowerCase().includes(query) || p.index.toLowerCase().includes(query)
    );
  }

  onPropertySearchFocus(): void {
    this.showPropertiesDropdown.set(true);
  }

  onPropertySearchBlur(): void {
    // Delay to allow click on dropdown item
    setTimeout(() => this.showPropertiesDropdown.set(false), 200);
  }

  onPropertySearchChange(value: string): void {
    this.propertySearchQuery.set(value);
    this.showPropertiesDropdown.set(true);
  }

  toggleProperty(propertyIndex: string): void {
    const current = this.selectedProperties();
    if (current.includes(propertyIndex)) {
      this.selectedProperties.set(current.filter(p => p !== propertyIndex));
      // Clear description if unselected
      if (!current.includes(propertyIndex)) {
        this.selectedPropertyDesc.set(null);
      }
    } else {
      this.selectedProperties.set([...current, propertyIndex]);
      // Show description for properties that have one
      const prop = this.weaponProperties.find(p => p.index === propertyIndex);
      if (prop?.desc && this.propertiesWithDesc.includes(propertyIndex)) {
        this.selectedPropertyDesc.set(prop.desc);
      } else if (propertyIndex === 'special') {
        this.selectedPropertyDesc.set('special');
      } else {
        this.selectedPropertyDesc.set(null);
      }
    }
  }

hasProperty(propertyIndex: string): boolean {
    return this.selectedProperties().includes(propertyIndex);
  }

  // Get property name for template
  getPropertyName(propertyIndex: string): string {
    const prop = this.weaponProperties.find(p => p.index === propertyIndex);
    return prop?.name || propertyIndex;
  }

  // Get property description
  getPropertyDesc(propertyIndex: string): string {
    const prop = this.weaponProperties.find(p => p.index === propertyIndex);
    return prop?.desc || '';
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
          url: `/api/2014/weapon-properties/${index}`,
          // Include description for 'special' property
          desc: index === 'special' ? this.specialPropertyDesc() : (prop?.desc || '')
        };
      });

      // Build damage type reference
      const damageType = this.formData().damage?.damage_type || { index: '', name: '', url: '' };

      // Build damage dice formula: count + die (e.g., 2d6)
      const dieType = this.formData().damage?.damage_dice || 'd6';
      const damageDice = `${this.damageCount()}${dieType}`;

      // Build two-handed damage reference
      const twoHandedDamageType = this.formData().two_handed_damage?.damage_type || { index: '', name: '', url: '' };
      const twoHandedDieType = this.formData().two_handed_damage?.damage_dice || 'd8';
      const twoHandedDamageDice = `${this.twoHandedDamageCount()}${twoHandedDieType}`;

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