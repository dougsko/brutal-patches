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
  @Output() patchInfoEvent = new EventEmitter<string>();

  constructor() {
   }

  ngOnInit(): void {
  }

  updateValue(value: string) {
    console.log("FOOOO")
    this.patchInfoEvent.emit(value);
  }

}
