import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

@Component({
  selector: 'app-tool-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tool-form.html',
  styleUrl: './tool-form.css',
})
export class ToolForm implements OnInit {
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
    tool_category: '',
  });

  // Separate string for textarea
  descString = signal('');

  // Tool categories
  toolCategories = [
    "Artisan's Tools",
    "Gaming Sets",
    "Musical Instruments",
    "Other Tools"
  ];

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
      const item = await this.itemsService.getItem(id, 'tool');
      this.formData.update(d => ({
        ...d,
        name: item.name || '',
        desc: item.desc || [],
        cost: item.cost || { quantity: 0, unit: 'gp' },
        weight: item.weight ?? 0,
        tool_category: item.tool_category || '',
      }));

      // Convert desc array to string for textarea
      const desc = item.desc || [];
      this.descString.set(Array.isArray(desc) ? desc.join('\n\n') : '');
    } catch (error) {
      console.error('Error loading tool data:', error);
      this.error.set('Failed to load tool data');
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
          index: 'tool',
          name: 'Tool',
          url: '/api/2014/equipment-categories/tools',
        },
      };

      if (this.isEditMode()) {
        const itemId = this.route.snapshot.paramMap.get('id') || '';
        await this.itemsService.update(itemId, data, 'tool');
      } else {
        await this.itemsService.create(data, 'tool');
      }

      this.router.navigate(['/manual'], {
        queryParams: { section: 'items' },
      });
    } catch (err) {
      console.error('Error creating tool:', err);
      this.error.set('Error creating tool. Please try again.');
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
