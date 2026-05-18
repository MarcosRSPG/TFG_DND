import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

const DIE_SIDES: Readonly<Record<DieType, number>> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
  d100: 100,
};

const ROLL_ANIMATION_MS = 600;

@Component({
  selector: 'app-dice-roller',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './dice-roller.html',
  styleUrl: './dice-roller.css',
})
export class DiceRollerComponent {
  readonly isOpen = signal(false);
  readonly quantity = signal<number>(1);
  readonly dieType = signal<DieType>('d20');
  readonly results = signal<number[]>([]);
  readonly isRolling = signal(false);

  readonly total = computed(() => this.results().reduce((a, b) => a + b, 0));
  readonly hasResults = computed(() => this.results().length > 0);
  readonly previewSlots = computed(() => Array.from({ length: this.quantity() }, (_, i) => i));

  readonly diceTypes: readonly DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
  readonly maxQuantity = 10;
  readonly minQuantity = 1;

  open(): void {
    this.results.set([]);
    this.isOpen.set(true);
  }

  close(): void {
    if (this.isRolling()) return;
    this.isOpen.set(false);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  setQuantity(value: number): void {
    if (!Number.isFinite(value)) return;
    const clamped = Math.max(this.minQuantity, Math.min(this.maxQuantity, Math.floor(value)));
    this.quantity.set(clamped);
    this.results.set([]);
  }

  setDieType(type: DieType): void {
    this.dieType.set(type);
    this.results.set([]);
  }

  roll(): void {
    if (this.isRolling()) return;
    const sides = DIE_SIDES[this.dieType()];
    const count = this.quantity();
    this.results.set([]);
    this.isRolling.set(true);
    setTimeout(() => {
      this.results.set(Array.from({ length: count }, () => this.rollDie(sides)));
      this.isRolling.set(false);
    }, ROLL_ANIMATION_MS);
  }

  private rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }
}
