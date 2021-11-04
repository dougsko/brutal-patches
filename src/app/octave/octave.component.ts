import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'octave',
  templateUrl: './octave.component.html',
  styleUrls: ['./octave.component.scss']
})
export class OctaveComponent implements OnInit {
  @Input() value!: string;
  @Output() newValueEvent = new EventEmitter<any>();

  name!: string;

  constructor() { }

  ngOnInit(): void {
    this.name = "octave";
  }

  changeOctave(event: any) {
    this.value = event.args.value;
    this.newValueEvent.emit({field: this.name, value: this.value});
  }

}
