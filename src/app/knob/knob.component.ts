import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'knob',
  templateUrl: './knob.component.html',
  styleUrls: ['./knob.component.scss']
})
export class KnobComponent implements OnInit {
  @Input() name!: string;
  @Input() label!: string;
  @Input() value!: string;
  @Input() sFlow!: string;
  @Input() lFlow!: string;
  @Output() newValueEvent = new EventEmitter<number>();

  outerId: string;

  style: any =
  {
      stroke: '#dfe3e9', 
      strokeWidth: 3, 
      fill: { 
        color: '#fefefe', 
        gradientType: 'linear', 
        gradientStops: [[0, 1], [50, 0.9], [100, 1]] 
      }
  };

  marks: any =
  {
      //colorRemaining: '#333',
      //colorProgress: '#333',//'#2db2e4',
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

  progressBar: any =
  {
      size: '30%',
      offset: '70%',
      background: { fill: '#eee', stroke: '#eee' }
  };

  pointer: any =
  {
      type: 'line', thickness: 3, style: { fill: '#fd9901', stroke: '#fd9901' },
      size: '30%', offset: '70%'
  };




  constructor() {
    this.outerId = "";
   }

  ngOnInit(): void {
    this.outerId = this.name.replace(/_/, "-");
  }

  turnKnob(event: any) {
    this.value = event.args.value;
    this.newValueEvent.emit(parseInt(this.value));
  }

  

}
