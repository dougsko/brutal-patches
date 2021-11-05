import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from 'server-src/src/interfaces/patch';

@Component({
  selector: 'knob',
  templateUrl: './knob.component.html',
  styleUrls: ['./knob.component.scss']
})
export class KnobComponent implements OnInit {
  @Input() name!: string;
  @Input() label!: string;
  @Input() patch!: Patch;
  @Input() sFlow!: string;
  @Input() lFlow!: string;
  @Input() lower!: string;
  @Input() max!: string;
  @Output() newValueEvent = new EventEmitter<Patch>();

  outerId: string;
  id: string;
  maxData: number;
  value!: number;

  style: any = {
    stroke: '#dfe3e9',
    strokeWidth: 3,
    fill: {
      color: '#fefefe',
      gradientType: 'linear',
      gradientStops: [[0, 1], [50, 0.9], [100, 1]]
    }
  };

  marks: any = {
    colorRemaining: { color: 'grey', border: 'grey' },
    colorProgress: { color: '#00a4e1', border: '#00a4e1' },
    type: 'line',
    offset: '75%',
    thickness: 2,
    size: '2%',
    majorSize: '2%',
    majorInterval: 10,
    minorInterval: 2
  };

  progressBar: any = {
    size: '30%',
    offset: '70%',
    background: { fill: '#eee', stroke: '#eee' }
  };

  pointer: any = {
    type: 'line', thickness: 3, style: { fill: '#fd9901', stroke: '#fd9901' },
    size: '30%', offset: '70%'
  };

  constructor() {
    this.outerId = "";
    this.id = "";
    this.maxData = 100;
  }

  ngOnInit(): void {
    this.id = this.name;
    if(this.patch) {
      this.value = this.patch[this.name];
    }
    this.outerId = this.name.replace(/_/, "-");
    if (this.max) {
      this.maxData = parseInt(this.max);
    }
  }

  turnKnob(event: any) {
    this.value = event.args.value;
    this.patch[this.name] = this.value;
    this.newValueEvent.emit(this.patch)
  }

}
