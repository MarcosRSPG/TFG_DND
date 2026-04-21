import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Item } from '../../../interfaces/item';
import { ItemsService } from '../../../services/items-service';

@Component({
  selector: 'app-mount-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mount-form.html',
  styleUrl: './mount-form.css',
})
export class MountForm implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly router = inject(Router);

  isSubmitting = signal(false);
  error = signal<string | null>(null);

  formData = signal<Partial<Item>>({
    name: '',
    desc: [],
    cost: { quantity: 0, unit: 'gp' },
    weight: 0,
    vehicle_category: '',
    capacity: '',
    speed: { quantity: 0, unit: 'ft.' },
  });

  // Vehicle categories
  vehicleCategories = ['Mount', 'Tack', 'Harness', 'Vehicle (Land)', 'Vehicle (Water)', 'Vehicle (Air)'];

  // Speed units
  speedUnits = ['ft.', 'mph', 'km/h'];

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
          index: 'mounts-and-vehicles',
          name: 'Mounts and Vehicles',
          url: '/api/2014/equipment-categories/mounts-and-vehicles',
        },
      };

      await this.itemsService.create(data, 'mount');

      this.router.navigate(['/manual'], {
        queryParams: { section: 'items' },
      });
    } catch (err) {
      console.error('Error creating mount/vehicle:', err);
      this.error.set('Error creating mount/vehicle. Please try again.');
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