export interface Monster {
  id?: string;
  name: string;
  desc?: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  armor_class?: ArmorClass[];
  hit_points?: number;
  hit_dice: string;
  hit_points_roll?: string;
  speed: Record<string, number>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencies?: MonsterProficiency[];
  damage_vulnerabilities?: string[];
  damage_resistances?: string[];
  damage_immunities?: string[];
  condition_immunities?: ResourceReference[];
  senses?: {
    passive_perception?: number;
    darkvision?: string;
    blindsight?: string;
    truesight?: string;
    telepathy?: string;
    [key: string]: any;
  };
  languages?: string;
  challenge_rating: string;
  proficiency_bonus?: number;
  xp?: number;
  special_abilities?: MonsterAbility[];
  actions?: MonsterAction[];
  reactions?: MonsterAction[];
  legendary_actions?: MonsterAction[];
  forms?: MonsterForm[];
  image?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface ArmorClass {
  type: string;
  value: number;
  spell?: ResourceReference;
}

export interface ResourceReference {
  index: string;
  name: string;
  url: string;
}

export interface MonsterProficiency {
  value: number;
  proficiency: ResourceReference;
}

export interface MonsterAbility {
  name: string;
  desc: string;
  damage?: MonsterDamage[];
  spellcasting?: SpellcastingInfo;
  usage?: {
    type: string;
    rest_types?: string[];
    times?: number;
  };
}

export interface MonsterDamage {
  damage_type: ResourceReference;
  damage_dice: string;
}

export interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
  damage?: MonsterDamage[];
  actions?: MonsterAction[];
  usage?: {
    type: string;
    times?: number;
  };
}

export interface SpellcastingInfo {
  level: number;
  ability: ResourceReference;
  dc: number;
  modifier: number;
  components_required: string[];
  school: ResourceReference;
  slots: Record<string, number>;
  spells: SpellInfo[];
}

export interface SpellInfo {
  name: string;
  level: number;
  url: string;
  notes?: string;
  usage?: {
    type: string;
    rest_types?: string[];
  };
}

export interface MonsterForm {
  name: string;
  source: string;
}