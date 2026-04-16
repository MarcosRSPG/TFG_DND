export interface Monster {
  id?: string;
  index: string;
  name: string;
  desc?: string;
  size: string;
  type: string;
  subtype?: string;
  alignment: string;
  hit_points: number;
  hit_dice: string;
  speed?: Record<string, string>;
  challenge_rating: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  actions?: MonsterAction[];
  special_abilities?: MonsterAction[];
  legendary_actions?: MonsterAction[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface MonsterAction {
  name: string;
  desc: string;
}