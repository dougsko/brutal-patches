import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from '../interfaces/patch';

@Component({
  selector: 'patch-info',
  templateUrl: './patch-info.component.html',
  styleUrls: ['./patch-info.component.scss']
})
export class PatchInfoComponent implements OnInit {
  @Input() patch!: Patch;
  @Input() title!: string;
  @Input() description!: string;
  @Input() tags!: string;
  @Output() patchInfoEvent = new EventEmitter<any>();
  @Output() newValueEvent = new EventEmitter<Patch>();

  constructor() {
   }

  ngOnInit(): void {
  }

  updateValue(fieldName: string, text: string) {
    this.patchInfoEvent.emit({field: fieldName, value: text});
  }

  updateInfo(metaInfo: any) {
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
    this.newValueEvent.emit(this.patch);
  }

}
