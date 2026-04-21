import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  // Armor categories
  armorCategories = ['Light', 'Medium', 'Heavy'];

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
          index: 'armor',
          name: 'Armor',
          url: '/api/2014/equipment-categories/armor',
        },
      };

      await this.itemsService.create(data, 'armor');

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