import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { KnobComponent } from '../knob/knob.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { SliderComponent } from '../slider/slider.component';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'envelope',
  imports: [KnobComponent, ToggleComponent, SliderComponent],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './envelope.component.html',
  styleUrls: ['./envelope.component.scss'],
})
export class EnvelopeComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
