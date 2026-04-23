import { AdventuringGear } from './adventuring-gear';
import { Armor } from './armor';
import { Weapon } from './weapon';
import { MagicItem } from './magic-item';
import { Tool } from './tool';
import { Mount } from './mount';

export type ItemType =
  | 'adventuringgear'
  | 'armor'
  | 'weapon'
  | 'magicitem'
  | 'tool'
  | 'mount';

export type ItemSpecific =
  | AdventuringGear
  | Armor
  | Weapon
  | MagicItem
  | Tool
  | Mount;