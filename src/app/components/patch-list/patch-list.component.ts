import { Component, OnDestroy, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { Patch } from '../../interfaces/patch';
import { PatchService } from '../../services/patch.service';

@Component({
  selector: 'patch-list',
  templateUrl: './patch-list.component.html',
  styleUrls: ['./patch-list.component.scss']
})
export class PatchListComponent implements OnInit, OnDestroy {
  patches: Patch[] = [];
  visiblePatches: Patch[] = [];
  selectedPatch?: Patch;
  private patchSub!: Subscription;
  lowValue: number = 0;
  highValue: number = 25;
  totalPatches!: number;

  constructor(private patchService: PatchService) {
   }

  ngOnInit(): void {
    this.getPatchTotal();
    this.getLatestPatches(0, 100);
  }

  ngOnDestroy(): void {
    this.patchSub.unsubscribe();
  }

  getPatches(): void {
    this.patchSub = this.patchService.getPatches().subscribe( patches => {
      this.patches = patches;
    });
  }

  getLatestPatches(first: number, last: number): void {
    this.patchSub = this.patchService.getLatestPatches(first, last).subscribe( patches => {
      this.patches = patches;
      this.visiblePatches = this.patches.slice(this.lowValue, this.highValue);
    })
  }

  getPatchTotal(): void {
    this.patchSub = this.patchService.getPatchTotal().subscribe( total => {
      this.totalPatches = total;
    })
  }

  public getPaginatorData(event: PageEvent): PageEvent {
    this.lowValue = event.pageIndex % 4 * event.pageSize;
    this.highValue = this.lowValue + event.pageSize;
    if(this.highValue % 4 == 0) {
      this.getLatestPatches(this.highValue+1, this.highValue+101);
    }
    this.visiblePatches = this.patches.slice(this.lowValue, this.highValue);
    return event;
  }
  
}
