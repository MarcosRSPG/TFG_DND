import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Background } from '../../interfaces/background';
import { BackgroundsService } from '../../services/backgrounds-service';
import { DndOptionsService, DndProficiency } from '../../services/dnd-options-service';
import { ItemsService } from '../../services/items-service';
import { Item } from '../../interfaces/item';
import { VikingCheck } from '../../components/viking-check/viking-check';

@Component({
  selector: 'app-background-form',
  standalone: true,
  imports: [CommonModule, FormsModule, VikingCheck],
  templateUrl: './background-form.html',
  styleUrl: './background-form.css',
})
export class BackgroundForm implements OnInit {
  private readonly backgroundsService = inject(BackgroundsService);
  private readonly dndOptions = inject(DndOptionsService);
  private readonly itemsService = inject(ItemsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isEditMode = signal(false);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Form data
  formData = signal<Partial<Background>>({
    index: '',
    name: '',
    starting_proficiencies: [],
    starting_equipment: [],
    feature: {
      name: '',
      desc: [],
      is_variant: false,
    },
    personality_traits: { options: [], desc: '' },
    ideals: { options: [], desc: '' },
    bonds: { options: [], desc: '' },
    flaws: { options: [], desc: '' },
  });

  // For proficiency selection
  selectedProficiencies = signal<string[]>([]);
  proficiencyCount = signal(1);

  // For equipment selection
  selectedEquipment = signal<{ index: string; name: string; quantity: number }[]>([]);

  // For feature - search filter
  featureSearchQuery = signal('');

  // For multiple options in traits/ideals/bonds/flaws
  personalityTraitsOptions = signal<string[]>(['']);
  idealsOptions = signal<string[]>(['']);
  bondsOptions = signal<string[]>(['']);
  flawsOptions = signal<string[]>(['']);

  // Items list for equipment selection
  itemsList = signal<Item[]>([]);
  filteredItems = signal<Item[]>([]);
  itemsLoading = signal(false);

  // Expose Array for template
  Array = Array;

  // Available proficiencies
  get proficiencies(): DndProficiency[] {
    return this.dndOptions.proficiencies();
  }

  // Filtered features based on search (simulated features list)
  get availableFeatures(): string[] {
    const features = [
      'Researcher', 'Soldier', 'Sage', 'Criminal', 'Entertainer', 'Folk Hero',
      'Noble', 'Acolyte', 'Outlander', 'Pirate', 'Sailor', 'Urchin',
      'Hermit', 'Merchant', 'Scribe', 'Knight', 'Spy', 'Barbarian',
      'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin',
      'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
    ];
    const query = this.featureSearchQuery().toLowerCase();
    if (!query) return features;
    return features.filter(f => f.toLowerCase().includes(query));
  }

  ngOnInit(): void {
    this.dndOptions.loadProficiencies();
    this.loadItems();
  }

  async loadItems(): Promise<void> {
    this.itemsLoading.set(true);
    try {
      const items = await this.itemsService.getAll();
      this.itemsList.set(items);
      this.filteredItems.set(items);
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      this.itemsLoading.set(false);
    }
  }

  onFeatureSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.featureSearchQuery.set(input.value);
  }

  onFeatureSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.formData.update(d => ({
      ...d,
      feature: { ...d.feature!, name: select.value }
    }));
  }

  onProficiencyChange(index: number, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newProficiencies = [...this.selectedProficiencies()];

    // Ensure array is big enough
    while (newProficiencies.length <= index) {
      newProficiencies.push('');
    }

    newProficiencies[index] = select.value;
    this.selectedProficiencies.set(newProficiencies);
  }

  addProficiencyField(): void {
    this.proficiencyCount.update((c) => c + 1);
  }

  removeProficiencyField(): void {
    if (this.proficiencyCount() > 1) {
      this.proficiencyCount.update((c) => c - 1);
      const newProficiencies = [...this.selectedProficiencies()];
      newProficiencies.pop();
      this.selectedProficiencies.set(newProficiencies);
    }
  }

  // Equipment methods
  addEquipment(index: string): void {
    const item = this.itemsList().find(i => i['index'] === index);
    if (!item) return;
    
    const current = this.selectedEquipment();
    const exists = current.find(e => e.index === index);
    if (!exists) {
      this.selectedEquipment.set([...current, { index: index, name: item.name, quantity: 1 }]);
    }
  }

  removeEquipment(index: number): void {
    const current = [...this.selectedEquipment()];
    current.splice(index, 1);
    this.selectedEquipment.set(current);
  }

  updateEquipmentQuantity(index: number, quantity: number): void {
    const current = [...this.selectedEquipment()];
    if (current[index]) {
      current[index] = { ...current[index], quantity };
      this.selectedEquipment.set(current);
    }
  }

  // Multiple options methods for traits/ideals/bonds/flaws
  addOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws'): void {
    const signalMap = {
      personality_traits: this.personalityTraitsOptions,
      ideals: this.idealsOptions,
      bonds: this.bondsOptions,
      flaws: this.flawsOptions
    };
    const signal = signalMap[type];
    signal.update(opts => [...opts, '']);
  }

  removeOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number): void {
    const signalMap = {
      personality_traits: this.personalityTraitsOptions,
      ideals: this.idealsOptions,
      bonds: this.bondsOptions,
      flaws: this.flawsOptions
    };
    const signal = signalMap[type];
    signal.update(opts => opts.filter((_, i) => i !== index));
  }

  updateOption(type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number, value: string): void {
    const signalMap = {
      personality_traits: this.personalityTraitsOptions,
      ideals: this.idealsOptions,
      bonds: this.bondsOptions,
      flaws: this.flawsOptions
    };
    const signal = signalMap[type];
    signal.update(opts => {
      const newOpts = [...opts];
      newOpts[index] = value;
      return newOpts;
    });
  }

  async onSubmit(): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      // Convert selected proficiency indices to BackgroundReference format
      const startingProficiencies = this.selectedProficiencies()
        .filter((p) => p)
        .map((index) => {
          const prof = this.proficiencies.find((p) => p.index === index);
          return {
            index: index,
            name: prof?.name || index,
            url: prof?.url || `/api/2014/proficiencies/${index}`,
          };
        });

      // Convert selected equipment
      const startingEquipment = this.selectedEquipment().map(item => ({
        equipment: {
          index: item.index,
          name: item.name,
          url: `/api/2014/equipment/${item.index}`
        },
        quantity: item.quantity
      }));

      // Build options arrays for traits
      const personalityTraitsOptions = this.personalityTraitsOptions().filter(o => o.trim());
      const idealsOptions = this.idealsOptions().filter(o => o.trim());
      const bondsOptions = this.bondsOptions().filter(o => o.trim());
      const flawsOptions = this.flawsOptions().filter(o => o.trim());

      const data: Partial<Background> = {
        ...this.formData(),
        starting_proficiencies: startingProficiencies as any,
        starting_equipment: startingEquipment as any,
        personality_traits: {
          options: personalityTraitsOptions.length > 0 ? personalityTraitsOptions : undefined,
          desc: this.formData().personality_traits?.desc || undefined
        },
        ideals: {
          options: idealsOptions.length > 0 ? idealsOptions : undefined,
          desc: this.formData().ideals?.desc || undefined
        },
        bonds: {
          options: bondsOptions.length > 0 ? bondsOptions : undefined,
          desc: this.formData().bonds?.desc || undefined
        },
        flaws: {
          options: flawsOptions.length > 0 ? flawsOptions : undefined,
          desc: this.formData().flaws?.desc || undefined
        }
      };

      await this.backgroundsService.create(data);

      // Navigate back to backgrounds list
      this.router.navigate(['/manual'], {
        queryParams: { section: 'backgrounds' },
      });
    } catch (err) {
      console.error('Error creating background:', err);
      this.error.set('Error creating background. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  cancel(): void {
    this.router.navigate(['/manual'], {
      queryParams: { section: 'backgrounds' },
    });
  }
}