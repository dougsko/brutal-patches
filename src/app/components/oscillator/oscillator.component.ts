import { Component, Input, OnInit } from '@angular/core';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'oscillator',
  templateUrl: './oscillator.component.html',
  styleUrls: ['./oscillator.component.scss'],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class OscillatorComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
