export interface Race {
	id: string;
	index?: string;
	name: string;
	image?: string;
	speed: number;
	ability_bonuses: RaceAbilityBonus[];
	age: string;
	alignment: string;
	size: string;
	size_description: string;
	languages: RaceLanguage[];
	language_desc: string;
	traits: RaceTrait[];
	subraces: RaceSubrace[];
	url: string;
	updated_at: string;
}

export interface RaceAbilityBonus {
	ability_score: RaceAbilityScore;
	bonus: number;
}

export interface RaceAbilityScore {
	index: string;
	name: string;
	url: string;
}

export interface RaceLanguage {
	index: string;
	name: string;
	url: string;
}

export interface RaceTrait {
	index: string;
	name: string;
	url: string;
}

export interface RaceTraitDetail {
	index: string;
	name: string;
	desc: string[];
	url: string;
	updated_at?: string;
}

export interface RaceSubrace {
	id?: string;
	index: string;
	name: string;
	url: string;
}

export interface RaceListResponse {
	count: number;
	results: RacePreview[];
}

export interface RacePreview {
	id: string;
	index?: string;
	name: string;
	url: string;
}
