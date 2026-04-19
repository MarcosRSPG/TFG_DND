import { Item, ResourceReference } from '../item';

export interface MagicItemRarity {
  name: string;
}

export interface MagicItem extends Item {
  index: string;
  name: string;
  type: string;
  equipment_category: ResourceReference;
  rarity: MagicItemRarity;
  variants: ResourceReference[];
  variant: boolean;
  desc: string[];
  image?: string;
  url: string;
}
