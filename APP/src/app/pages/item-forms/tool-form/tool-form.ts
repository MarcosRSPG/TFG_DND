import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  isSubmitting = signal(false);
  error = signal<string | null>(null);

  formData = signal<Partial<Item>>({
    name: '',
    desc: [],
    cost: { quantity: 0, unit: 'gp' },
    weight: 0,
    tool_category: '',
  });

  // Tool categories
  toolCategories = [
    "Artisan's Tools",
    "Gaming Sets",
    "Musical Instruments",
    "Other Tools"
  ];

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
          index: 'tool',
          name: 'Tool',
          url: '/api/2014/equipment-categories/tools',
        },
      };

      await this.itemsService.create(data, 'tool');

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