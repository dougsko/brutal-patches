import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Patch } from '../interfaces/patch';
import { PatchService } from '../services/patch.service';

@Component({
  selector: 'patch',
  templateUrl: './patch.component.html',
  styleUrls: ['./patch.component.scss']
})
export class PatchComponent implements OnInit, OnDestroy {
  patches: Patch[] = [];
  selectedPatch?: Patch;
  private patchSub!: Subscription;

  constructor(private patchService: PatchService) {
   }

  ngOnInit(): void {
    this.getPatches();
  }

  ngOnDestroy(): void {
    this.patchSub.unsubscribe();
  }

  getPatches(): void {
    this.patchSub = this.patchService.getPatches().subscribe( patches => {
      this.patches = patches;
    });
  }
  
}
