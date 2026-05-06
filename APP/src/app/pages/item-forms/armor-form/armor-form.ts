import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';
import { VikingCheck } from '../../../components/viking-check/viking-check';

@Component({
  selector: 'app-armor-form',
  standalone: true,
  imports: [CommonModule, FormsModule, VikingCheck],
  templateUrl: './armor-form.html',
  styleUrl: './armor-form.css',
})
export class ArmorForm implements OnInit {
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
    armor_category: '',
    armor_class: { base: 10, dex_bonus: false },
    str_minimum: 0,
    stealth_disadvantage: false,
  });

  // Separate string for textarea
  descString = signal('');

  // Armor categories
  armorCategories = ['Light', 'Medium', 'Heavy'];

  // Cost units
  costUnits = ['cp', 'sp', 'ep', 'gp', 'pp'];

  ngOnInit(): void {
    const itemId = this.route.snapshot.paramMap.get('id');
    if (itemId) {
      this.isEditMode.set(true);
      this.loadItemData(itemId);
    }
  }

  private async loadItemData(id: string): Promise<void> {
    try {
      const item = await this.itemsService.getItem(id, 'armor');
      this.formData.update(d => ({
        ...d,
        name: item.name || '',
        desc: item.desc || [],
        cost: item.cost || { quantity: 0, unit: 'gp' },
        weight: item.weight ?? 0,
        armor_category: item.armor_category || '',
        armor_class: item.armor_class || { base: 10, dex_bonus: false },
        str_minimum: item.str_minimum ?? 0,
        stealth_disadvantage: item.stealth_disadvantage ?? false,
      }));

      // Convert desc array to string for textarea
      const desc = item.desc || [];
      this.descString.set(Array.isArray(desc) ? desc.join('\n\n') : '');
    } catch (error) {
      console.error('Error loading armor data:', error);
      this.error.set('Failed to load armor data');
    }
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Convert desc string to string[] for API
      const descArray = this.descString().trim() ? this.descString().split('\n\n').filter(d => d.trim()) : [];

      const data: Partial<Item> = {
        ...this.formData(),
        desc: descArray,
        equipment_category: {
          index: 'armor',
          name: 'Armor',
          url: '/api/2014/equipment-categories/armor',
        },
      };

      if (this.isEditMode()) {
        const itemId = this.route.snapshot.paramMap.get('id') || '';
        await this.itemsService.update(itemId, data);
      } else {
        await this.itemsService.create(data, 'armor');
      }

      this.router.navigate(['/manual'], {
        queryParams: { section: 'items' },
      });
    } catch (err) {
      console.error('Error creating armor:', err);
      this.error.set('Error creating armor. Please try again.');
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
