import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss']
})
export class ControlsComponent implements OnInit {
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
