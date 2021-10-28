import { Component, OnInit } from '@angular/core';
import { Patch } from '../interfaces/patch';
import { PatchService } from '../services/patch.service';

@Component({
  selector: 'patch',
  templateUrl: './patch.component.html',
  styleUrls: ['./patch.component.scss']
})
export class PatchComponent implements OnInit {
  patches: Patch[] = [];
  selectedPatch?: Patch;

  constructor(private patchService: PatchService) { }

  ngOnInit(): void {
    this.getPatches();
  }

  getPatches(): void {
    this.patchService.getPatches().subscribe( patches => {
      this.patches = patches;
    });
  }
  
}
