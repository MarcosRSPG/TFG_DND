export type ItemType = 'adventuringgear' | 'armor' | 'mount' | 'tool' | 'weapon' | 'magicitem';

export interface Item {
  id?: string;
  index: string;
  name: string;
  type?: string;
  desc?: string[];
  equipment_category?: {
    index: string;
    name: string;
    url: string;
  };
  cost?: {
    quantity: number;
    unit: string;
  };
  weight?: number;
  rarity?: {
    name: string;
  };
  updated_at?: string;
  [key: string]: unknown;
}