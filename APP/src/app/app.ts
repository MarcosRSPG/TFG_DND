import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DinHeader } from './components/din-header/din-header';
import { DiceRollerComponent } from './components/dice-roller/dice-roller';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DinHeader, DiceRollerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
