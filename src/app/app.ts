import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { activarFocoTrasNavegacion } from '@core/layout/foco-navegacion';

// Import directo, no desde '@shared/ui': el barril mete formularios y CDK Overlay en el bundle inicial.
import { ToastContainerComponent } from '@shared/ui/feedback/toast-container.component';

@Component({
  imports: [RouterOutlet, ToastContainerComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  constructor() {
    // Foco al h1 y anuncio del título tras cada navegación (DESIGN.md §10).
    activarFocoTrasNavegacion();
  }
}
