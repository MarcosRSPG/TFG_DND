export interface Subrace {
  index: string;
  name: string;
  race: RaceReference;
  desc: string;
  ability_bonuses: AbilityBonus[];
  racial_traits: Trait[];
  url: string;
  updated_at: string;
}

export interface RaceReference {
  index: string;
  name: string;
  url: string;
}

export interface AbilityBonus {
  ability_score: AbilityScore;
  bonus: number;
}

export interface AbilityScore {
  index: string;
  name: string;
  url: string;
}

export interface Trait {
  index: string;
  name: string;
  url: string;
}
