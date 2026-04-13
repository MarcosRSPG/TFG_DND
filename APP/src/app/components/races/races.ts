import { Component } from '@angular/core';

interface RacePreview {
  name: string;
  origin: string;
}

@Component({
  selector: 'app-races',
  imports: [],
  templateUrl: './races.html',
  styleUrl: './races.css',
})
export class Races {
  // Temporary mock list. Later this can be replaced by API data.
  readonly races: RacePreview[] = [
    { name: 'Humano', origin: 'Reinos Centrales' },
    { name: 'Elfo', origin: 'Bosques Antiguos' },
    { name: 'Enano', origin: 'Montanas del Norte' },
    { name: 'Mediano', origin: 'Valles Verdes' },
    { name: 'Draconido', origin: 'Tierras Escamadas' },
    { name: 'Tiefling', origin: 'Ciudades Fronterizas' },
  ];
}
