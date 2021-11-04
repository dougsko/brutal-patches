import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'patch-info',
  templateUrl: './patch-info.component.html',
  styleUrls: ['./patch-info.component.scss']
})
export class PatchInfoComponent implements OnInit {
  @Input() title!: string;
  @Input() description!: string;
  @Input() tags!: string;
  @Output() patchInfoEvent = new EventEmitter<any>();

  constructor() {
   }

  ngOnInit(): void {
  }

  updateValue(fieldName: string, text: string) {
    this.patchInfoEvent.emit({field: fieldName, value: text});
  }

}
