import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

// API local
const API_URL = 'http://localhost:8000';

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
  private readonly route = inject(ActivatedRoute);

  isEditMode = signal(false);
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

  // Separate string for textarea
  descString = signal('');

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

  // Image upload
  imagePreview: string | null = null;
  originalImageUrl: string | null = null;
  selectedFile: File | null = null;

  // Damage count for the dice formula (e.g., 2 for 2d6)
  damageCount = signal(1);

  // Two-handed damage count
  twoHandedDamageCount = signal(1);

  ngOnInit(): void {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      this.isEditMode.set(true);
      this.loadItemData(itemId);
    }
    this.loadWeaponProperties();
  }

  private async loadItemData(id: string): Promise<void> {
    try {
      const item = await this.itemsService.getItem(id, 'weapon');
      this.formData.update(d => ({
        ...d,
        name: item.name || '',
        desc: item.desc || [],
        cost: item.cost || { quantity: 0, unit: 'gp' },
        weight: item.weight ?? 0,
        image: item.image || '',
        weapon_category: item.weapon_category || '',
        weapon_range: item.weapon_range || 'Melee',
        damage: item.damage || { damage_dice: '1d4' },
        range: item.range || { normal: 5, long: 0 },
        properties: item.properties || [],
        two_handed_damage: item.two_handed_damage || {},
      }));

      // Convert desc array to string for textarea
      const desc = item.desc || [];
      this.descString.set(Array.isArray(desc) ? desc.join('\n\n') : '');

      // Restore selected properties
      if (Array.isArray(item.properties)) {
        const propIndexes = item.properties.map((p: any) => p.index || p);
        this.selectedProperties.set(propIndexes);
      }

      // Parse damage dice count and die type
      if (item.damage?.damage_dice) {
        const match = item.damage.damage_dice.match(/^(\d+)(d\d+)$/);
        if (match) {
          this.damageCount.set(parseInt(match[1], 10));
          this.formData.update(d => ({
            ...d,
            damage: { ...d.damage, damage_dice: match[2] },
          }));
        }
      }

      // Parse two-handed damage dice count and die type
      if (item.two_handed_damage?.damage_dice) {
        const match = item.two_handed_damage.damage_dice.match(/^(\d+)(d\d+)$/);
        if (match) {
          this.twoHandedDamageCount.set(parseInt(match[1], 10));
          this.formData.update(d => ({
            ...d,
            two_handed_damage: { ...d.two_handed_damage, damage_dice: match[2] },
          }));
        }
      }

      // Load existing image preview
      if (item.image) {
        this.imagePreview = item.image.startsWith('http')
          ? item.image
          : `${API_URL}${item.image}`;
        this.originalImageUrl = this.imagePreview;
      }
    } catch (error) {
      console.error('Error loading weapon data:', error);
      this.error.set('Failed to load weapon data');
    }
  }

  async loadWeaponProperties(): Promise<void> {
    this.weaponPropertiesLoading.set(true);
    try {
      const response = await fetch(`${API_URL}/options/weapon-properties`);
      const data = await response.json();
      
      // Load each property with its description
      const properties: WeaponProperty[] = [];
      for (const prop of data) {
        properties.push({
          index: prop.index,
          name: prop.name,
          desc: prop.desc?.[0] || ''
        });
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
      // Convert desc string to string[] for API
      const descArray = this.descString().trim() ? this.descString().split('\n\n').filter(d => d.trim()) : [];

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
        desc: descArray,
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

      if (this.isEditMode()) {
        const itemId = this.route.snapshot.paramMap.get('id') || '';
        if (this.selectedFile) {
          const formData = this.buildFormData();
          await this.itemsService.update(itemId, formData);
        } else {
          await this.itemsService.update(itemId, data);
        }
      } else {
        if (this.selectedFile) {
          const formData = this.buildFormData();
          await this.itemsService.create(formData, 'weapon');
        } else {
          await this.itemsService.create(data, 'weapon');
        }
      }

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

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  revertImage(): void {
    this.selectedFile = null;
    this.imagePreview = this.originalImageUrl;
    const input = document.getElementById('image') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private buildFormData(): FormData {
    const formData = new FormData();

    // Append all form data fields
    const data = this.formData();
    Object.keys(data).forEach(key => {
      const value = data[key as keyof typeof data];
      if (value !== undefined && value !== null && key !== 'image') {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    // Append properties as JSON
    if (this.selectedProperties().length > 0) {
      formData.append('properties', JSON.stringify(this.selectedProperties()));
    }

    // Append the image file
    if (this.selectedFile) {
      formData.append('image', this.selectedFile, this.selectedFile.name);
    }

    return formData;
  }
}
