import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, NO_ERRORS_SCHEMA, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnobComponent } from '../knob/knob.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { jqxSliderModule } from 'jqwidgets-ng/jqxslider';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'sequencer',
  templateUrl: './sequencer.component.html',
  styleUrls: ['./sequencer.component.scss']
  imports: [CommonModule, KnobComponent, ToggleComponent, jqxSliderModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class SequencerComponent implements OnInit {
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
