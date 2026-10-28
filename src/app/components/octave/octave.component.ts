import { Component, Input, OnInit } from '@angular/core';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Patch } from '../../interfaces/patch';

@Component({
  selector: 'octave',
  templateUrl: './octave.component.html',
  styleUrls: ['./octave.component.scss'],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class OctaveComponent implements OnInit {
  @Input() patch!: Patch;

  name: string;
  value!: number;

  constructor() {
    this.name = "octave";
   }

  ngOnInit(): void {
    this.value = this.patch[this.name];
  }

  changeOctave(direction: string) {
    if (direction === "up") {
      if (this.value < 5) {
        this.value += 1
      }
    } else if (direction === "down") {
      if (this.value > 1) {
        this.value -= 1
      }
    }
    this.patch[this.name] = this.value;
  }

}
