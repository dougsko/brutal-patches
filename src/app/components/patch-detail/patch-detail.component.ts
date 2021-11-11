import { Component, Input, OnInit } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'patch-detail',
  templateUrl: './patch-detail.component.html',
  styleUrls: ['./patch-detail.component.scss']
})
export class PatchDetailComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

  savePatch(): void {
    console.log("saving patch");
    console.log(this.patch);
  }
}
