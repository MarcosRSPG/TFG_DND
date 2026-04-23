export interface DndProficiency {
  index: string;
  name: string;
  url: string;
  type?: string;
}

export interface DndSchool {
  index: string;
  name: string;
  url: string;
  desc?: string[];
}

export interface DndClass {
  index: string;
  name: string;
  url: string;
}

export interface DndAlignment {
  index: string;
  name: string;
  url: string;
  desc?: string;
}

export interface DndEquipmentCategory {
  index: string;
  name: string;
  url: string;
  equipment?: Array<{
    index: string;
    name: string;
    url: string;
  }>;
}