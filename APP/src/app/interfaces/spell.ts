export interface Spell {
  id?: string;
  name: string;
  desc: string[];
  higher_level?: string[];
  range: string;
  components: string[];
  material?: string;
  ritual: boolean;
  duration: string;
  concentration: boolean;
  casting_time: string;
  level: number;
  school?: SpellReference;
  classes?: SpellReference[];
  subclasses?: SpellReference[];
  image?: string;
  // Additional D&D API fields
  damage?: {
    damage_type?: SpellReference;
    damage_at_slot_level?: Record<string, string>;
  };
  dc?: {
    dc_type?: SpellReference;
    dc_success?: string;
  };
  area_of_effect?: {
    type: string;
    size: number;
  };
  heal_at_slot_level?: Record<string, string>;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface SpellReference {
  index: string;
  name: string;
  url: string;
}