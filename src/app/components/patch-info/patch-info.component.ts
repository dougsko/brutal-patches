import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { Patch } from '../../interfaces/patch';

@Component({
  selector: 'patch-info',
  imports: [FormsModule, MatChipsModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './patch-info.component.html',
  styleUrls: ['./patch-info.component.scss'],
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

  add(event: any): void {
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
