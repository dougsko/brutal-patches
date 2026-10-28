import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { Patch } from '../../interfaces/patch';

@Component({
  selector: 'patch-info',
  templateUrl: './patch-info.component.html',
  styleUrls: ['./patch-info.component.scss'],
  imports: [CommonModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class PatchInfoComponent implements OnInit {
  @Input() patch!: Patch;

  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  constructor() {
   }

  ngOnInit(): void {
    
  }

  updateInfo(metaInfo: any) {
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
  }

  add(event: MatChipInputEvent): void {
    if(!this.patch.tags) {
      this.patch.tags = [];
    }
    
    const value = (event.value || '').trim();
    // Add our tag
    if (value){
      this.patch.tags.push(value);
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(tag: string): void {
    const index = this.patch.tags!.indexOf(tag);

    if (index >= 0) {
      this.patch.tags!.splice(index, 1);
    }

  }

}
