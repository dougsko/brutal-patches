import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { KnobComponent } from '../knob/knob.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'controls',
  imports: [KnobComponent, ToggleComponent],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss'],
})
export class ControlsComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
