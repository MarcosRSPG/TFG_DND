export interface ApiReference {
  index: string;
  name: string;
  url?: string;
}

export interface CharacterProficiency {
  proficiency: ApiReference;
  value?: number;
}

export interface CharacterSpeed {
  walk?: string;
  fly?: string;
  swim?: string;
  climb?: string;
  crawl?: string;
  burrow?: string;
  hover?: string;
}

export interface CharacterCash {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface WeaponData {
  damage_dice: string;
  damage_type: string;
  ability: 'strength' | 'dexterity';
}

export interface ArmorData {
  base_ac: number;
  armor_type: 'light' | 'medium' | 'heavy' | 'shield';
  max_dex_bonus?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'item';
  quantity: number;
  weight?: number;
  description?: string;
  state: 'equipped' | 'stored' | 'carried';
  weapon_data?: WeaponData;
  armor_data?: ArmorData;
}

export interface Trait {
  id: string;
  name: string;
  description: string;
  source: 'race' | 'subrace' | 'class' | 'background' | 'custom';
}

export interface SpellEntry {
  index: string;
  name: string;
  level: number;
  school?: string;
  // Datos de combate (rellenados desde el catálogo)
  damage_dice?: string;        // ej: "8d6"
  damage_type?: string;        // ej: "fire"
  attack_type?: 'melee' | 'ranged' | 'save' | null;
  save_type?: string;          // ej: "DEX" (para spells de salvación)
  dc_success?: string;         // ej: "half"
}

export interface SpellSlot {
  total: number;
  used: number;
}

export interface Spellcasting {
  spellcasting_ability?: string;
  spell_save_dc: number;
  spell_attack_bonus: number;
  spell_slots: Record<string, SpellSlot>;
  known_spells: SpellEntry[];
  prepared_spells: SpellEntry[];
}

export interface CharacterInventory {
  items: InventoryItem[];
  cash: CharacterCash;
}

export interface Character {
  _id?: string;
  id?: string;
  index?: string;
  name: string;
  player?: string;
  level: number;
  character_class: ApiReference;
  subclass?: ApiReference;
  race: ApiReference;
  subrace?: ApiReference;
  alignment: string;
  background: ApiReference;
  hit_points: number;
  hit_points_current?: number;
  temp_hp?: number;
  hit_dice: string;
  hit_points_roll?: string;
  speed: CharacterSpeed;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiency_bonus: number;
  saving_throws: string[];
  proficiencies: CharacterProficiency[];
  inventory: CharacterInventory;
  spellcasting?: Spellcasting;
  traits: Trait[];
  custom_traits: Trait[];
  // Bio
  notes?: string;
  history?: string;
  image?: string;
  personality_traits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
}

export interface Skill {
  name: string;
  ability: StatKey;
  index: string;
}

export const SKILLS: Skill[] = [
  { name: 'Acrobatics',     ability: 'dexterity',     index: 'skill-acrobatics' },
  { name: 'Animal Handling',ability: 'wisdom',        index: 'skill-animal-handling' },
  { name: 'Arcana',         ability: 'intelligence',  index: 'skill-arcana' },
  { name: 'Athletics',      ability: 'strength',      index: 'skill-athletics' },
  { name: 'Deception',      ability: 'charisma',      index: 'skill-deception' },
  { name: 'History',        ability: 'intelligence',  index: 'skill-history' },
  { name: 'Insight',        ability: 'wisdom',        index: 'skill-insight' },
  { name: 'Intimidation',   ability: 'charisma',      index: 'skill-intimidation' },
  { name: 'Investigation',  ability: 'intelligence',  index: 'skill-investigation' },
  { name: 'Medicine',       ability: 'wisdom',        index: 'skill-medicine' },
  { name: 'Nature',         ability: 'intelligence',  index: 'skill-nature' },
  { name: 'Perception',     ability: 'wisdom',        index: 'skill-perception' },
  { name: 'Performance',    ability: 'charisma',      index: 'skill-performance' },
  { name: 'Persuasion',     ability: 'charisma',      index: 'skill-persuasion' },
  { name: 'Religion',       ability: 'intelligence',  index: 'skill-religion' },
  { name: 'Sleight of Hand',ability: 'dexterity',     index: 'skill-sleight-of-hand' },
  { name: 'Stealth',        ability: 'dexterity',     index: 'skill-stealth' },
  { name: 'Survival',       ability: 'wisdom',        index: 'skill-survival' },
];

export interface CharacterDraft extends Partial<Character> {
  // HP override desde el wizard
  custom_max_hp?: number;
  // Campos temporales del wizard (no van al modelo final)
  character_class_hit_die?: number;
  race_speed?: number;
  racial_bonuses?: Partial<Record<StatKey, number>>;
  proficiency_names?: string[];
  saving_throw_names?: string[];
  background_traits?: Trait[];
  class_spell_slots?: Record<string, SpellSlot>;
  class_spellcasting_ability?: string;
  selected_personality_traits?: string[];
  selected_ideals?: string[];
  selected_bonds?: string[];
  selected_flaws?: string[];
}

export type StatKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

export const STAT_ABBREVIATIONS: Record<StatKey, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

export const ALIGNMENTS = [
  'Lawful Good',
  'Neutral Good',
  'Chaotic Good',
  'Lawful Neutral',
  'True Neutral',
  'Chaotic Neutral',
  'Lawful Evil',
  'Neutral Evil',
  'Chaotic Evil',
];



export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export function statModifier(value: number): number {
  return Math.floor((value - 10) / 2);
}

export function signedModifier(value: number): string {
  const mod = statModifier(value);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
