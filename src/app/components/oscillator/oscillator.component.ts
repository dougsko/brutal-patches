import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'oscillator',
  templateUrl: './oscillator.component.html',
  styleUrls: ['./oscillator.component.scss']
})
export class OscillatorComponent implements OnInit {
  @Input() patch!: Patch;
  @Output() newValueEvent = new EventEmitter<Patch>();

  constructor() { }

  ngOnInit(): void {
  }

  updateInfo(metaInfo: any) {
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
    this.newValueEvent.emit(this.patch);
  }

}
