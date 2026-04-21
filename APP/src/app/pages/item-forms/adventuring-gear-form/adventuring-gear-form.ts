import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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

  isSubmitting = signal(false);
  error = signal<string | null>(null);

  formData = signal<Partial<Item>>({
    name: '',
    desc: [],
    cost: { quantity: 0, unit: 'gp' },
    weight: 0,
  });

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
          index: 'adventuring-gear',
          name: 'Adventuring Gear',
          url: '/api/2014/equipment-categories/adventuring-gear',
        },
      };

      await this.itemsService.create(data, 'adventuringgear');

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