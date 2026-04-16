import type { ClassReference } from './class';

export interface Subclass {
  index: string;
  class: SubclassClassReference;
  name: string;
  subclass_flavor: string;
  desc: string[];
  subclass_levels: string;
  url: string;
  updated_at: string;
  spells: SubclassSpell[];
}

export interface SubclassClassReference {
  index: string;
  name: string;
  url: string;
}

export interface SubclassSpell {
  prerequisites?: unknown[];
  spell?: {
    index: string;
    name: string;
    url: string;
  };
}

export interface SubclassLevel {
  level: number;
  features: ClassReference[];
}