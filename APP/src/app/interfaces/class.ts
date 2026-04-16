export interface DndClass {
  index: string;
  name: string;
  hit_die: number;
  proficiency_choices: ClassChoice[];
  proficiencies: ClassReference[];
  saving_throws: ClassReference[];
  starting_equipment: ClassStartingEquipment[];
  starting_equipment_options: ClassChoice[];
  class_levels: string;
  multi_classing?: ClassMultiClassing;
  subclasses: ClassReference[];
  spellcasting?: ClassSpellcasting;
  spells?: string;
  url: string;
  updated_at: string;
}

export interface DndClassListResponse {
  count: number;
  results: DndClassPreview[];
}

export interface DndClassPreview {
  index: string;
  name: string;
  url: string;
}

export interface ClassReference {
  index: string;
  name: string;
  url: string;
}

export interface ClassChoice {
  desc: string;
  choose: number;
  type: string;
  from: Record<string, unknown>;
}

export interface ClassStartingEquipment {
  equipment: ClassReference;
  quantity: number;
}

export interface ClassSpellcasting {
  level: number;
  spellcasting_ability: ClassReference;
  info: ClassSpellcastingInfo[];
}

export interface ClassSpellcastingInfo {
  name: string;
  desc: string[];
}

export interface ClassMultiClassing {
  prerequisites: ClassPrerequisite[];
  proficiencies: ClassReference[];
}

export interface ClassPrerequisite {
  ability_score: ClassReference;
  minimum_score: number;
}

export interface DndClassLevel {
  level: number;
  ability_score_bonuses: number;
  prof_bonus: number;
  features: ClassReference[];
  spellcasting?: Record<string, number | null | undefined>;
  class_specific?: Record<string, number | string | boolean | null | undefined>;
}

export interface FeatureDetail {
  index: string;
  name: string;
  url: string;
  desc?: string[];
}

export interface LeveledFeature {
  level: number;
  feature: FeatureDetail;
}