import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DinHeader } from './components/din-header/din-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DinHeader],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('APP');
}
