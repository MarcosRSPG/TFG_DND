import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

@Component({
  selector: 'app-adventuring-gear-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adventuring-gear-form.html',
  styleUrl: './adventuring-gear-form.css',
})
export class AdventuringGearForm implements OnInit {
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
  });

  // Separate string for textarea
  descString = signal('');

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
      const item = await this.itemsService.getItem(id, 'adventuringgear');
      this.formData.update(d => ({
        ...d,
        name: item.name || '',
        desc: item.desc || [],
        cost: item.cost || { quantity: 0, unit: 'gp' },
        weight: item.weight ?? 0,
      }));

      // Convert desc array to string for textarea
      const desc = item.desc || [];
      this.descString.set(Array.isArray(desc) ? desc.join('\n\n') : '');
    } catch (error) {
      console.error('Error loading adventuring gear data:', error);
      this.error.set('Failed to load adventuring gear data');
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
          index: 'adventuring-gear',
          name: 'Adventuring Gear',
          url: '/api/2014/equipment-categories/adventuring-gear',
        },
      };

      if (this.isEditMode()) {
        const itemId = this.route.snapshot.paramMap.get('id') || '';
        await this.itemsService.update(itemId, data);
      } else {
        await this.itemsService.create(data, 'adventuringgear');
      }

      this.router.navigate(['/manual'], {
        queryParams: { section: 'items' },
      });
    } catch (err) {
      console.error('Error creating item:', err);
      this.error.set('Error creating item. Please try again.');
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
