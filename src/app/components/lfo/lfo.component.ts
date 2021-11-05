import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'lfo',
  templateUrl: './lfo.component.html',
  styleUrls: ['./lfo.component.scss']
})
export class LfoComponent implements OnInit {
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
