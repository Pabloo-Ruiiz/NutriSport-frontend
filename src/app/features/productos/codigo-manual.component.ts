import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { idUnico } from '@shared/ui/form/control-campo';

@Component({
  selector: 'app-codigo-manual',
  imports: [ReactiveFormsModule, NsButtonComponent, NsInputDirective],
  templateUrl: './codigo-manual.component.html',
  styleUrl: './codigo-manual.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodigoManualComponent {
  readonly detectado = output<string>();
  readonly buscando = input(false);
  protected readonly id = idUnico('ns-codigo-manual');
  protected readonly codigo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{8,14}$/)],
  });
  protected buscar(): void {
    this.codigo.markAsTouched();
    if (this.codigo.valid && !this.buscando()) this.detectado.emit(this.codigo.value);
  }
}
