import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { KnobComponent } from '../knob/knob.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'filter',
  imports: [KnobComponent, ToggleComponent],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss'],
})
export class FilterComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
