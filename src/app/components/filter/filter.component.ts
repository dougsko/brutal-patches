import { Component, Input, OnInit } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'filter',
  templateUrl: './filter.component.html',
  styleUrls: ['./filter.component.scss']
})
export class FilterComponent implements OnInit {
  @Input() patch!: Patch;
  //@Output() newValueEvent = new EventEmitter<Patch>();

  constructor() { }

  ngOnInit(): void {
  }

  /* updateInfo(metaInfo: any) {
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
    this.newValueEvent.emit(this.patch);
  } */
}
