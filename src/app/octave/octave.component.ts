import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from '../interfaces/patch';

@Component({
  selector: 'octave',
  templateUrl: './octave.component.html',
  styleUrls: ['./octave.component.scss']
})
export class OctaveComponent implements OnInit {
  @Input() patch!: Patch;
  @Output() newValueEvent = new EventEmitter<Patch>();

  name: string;
  value!: number;

  constructor() {
    this.name = "octave";
   }

  ngOnInit(): void {
    this.value = this.patch[this.name];
    console.log(this.value);
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
    this.newValueEvent.emit(this.patch);
  }

}
