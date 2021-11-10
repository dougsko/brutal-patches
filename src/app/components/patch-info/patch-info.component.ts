import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, Input, OnInit } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { Patch } from '../../interfaces/patch';

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

  selectable = true;
  removable = true;
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  constructor() {
   }

  ngOnInit(): void {
    this.patch.tags = ["foo", "bar"];
    /* if(!this.patch.tags) {
      this.patch.tags = [];
    } */
  }

  updateInfo(metaInfo: any) {
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    // Add our tag
    if (value && this.patch.tags){
      this.patch.tags.push(value);
    }
    console.log(this.patch)

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(fruit: string): void {
    const index = this.patch.tags!.indexOf(fruit);

    if (index >= 0) {
      this.patch.tags!.splice(index, 1);
    }

  }

}
