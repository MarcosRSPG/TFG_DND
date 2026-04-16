export interface Spell {
  id?: string;
  index: string;
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