import { Component, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToggleComponent } from '../toggle/toggle.component';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'lfo',
  templateUrl: './lfo.component.html',
  styleUrls: ['./lfo.component.scss']
  imports: [CommonModule, ToggleComponent],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class LfoComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
