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

  lowGet: number = 0;
  highGet: number = 100;
  lowShow: number = 0;
  highShow: number = 25;

  constructor(private patchService: PatchService) {
   }

  ngOnInit(): void {
    this.getPatchTotal();
    this.getLatestPatches(0, 100);
    // console.log(`lowGet: ${this.lowGet} highGet: ${this.highGet}`);
    // console.log(`lowShow: ${this.lowShow} highShow: ${this.highShow}`);
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
      this.visiblePatches = this.patches.slice(this.lowShow, this.highShow);
    })
  }

  getPatchTotal(): void {
    this.patchSub = this.patchService.getPatchTotal().subscribe( total => {
      this.totalPatches = total;
    })
  }

  public getPaginatorData(event: PageEvent): PageEvent {
    if (event.previousPageIndex && event.pageIndex - event.previousPageIndex < 0) {
      if (event.previousPageIndex - event.pageIndex > 1) {
        // console.log("big jump back")
        this.lowShow = 0;
        this.highShow = 25;
        this.lowGet = 0;
        this.highGet = 100;
        this.getLatestPatches(this.lowGet, this.highGet);
      } else {
        // console.log("small jump back");
        this.lowShow -= 25;
        this.highShow = this.lowShow + 25;
        if (this.lowShow < 0) {
          this.highGet = this.lowGet;
          this.lowGet = this.highGet - 100;
          this.lowShow = 75;
          this.highShow = 100;
          if(this.lowGet < 0) {
            this.lowGet = 0;
            this.highGet = 100;
            this.lowShow = 0;
            this.highShow = 25;
          }
          this.getLatestPatches(this.lowGet, this.highGet);
        }
      }
    } else if (event.pageIndex - event.previousPageIndex! > 0) {
      if (event.pageIndex - event.previousPageIndex! > 1) {
        // console.log("big jump forward");
        this.lowShow = 75;
        this.highShow = 100;
        this.highGet = this.totalPatches;
        this.lowGet = this.highGet - 100;
        this.getLatestPatches(this.lowGet, this.highGet);
      } else {
        // console.log("small jump forward");
        this.lowShow += 25;
        this.highShow = this.lowShow + 25;

        if (this.highShow > 100) {
          this.lowGet = this.highGet;
          this.highGet = this.lowGet + 100;
          this.lowShow = 0;
          this.highShow = 25;
          if (this.highGet > this.totalPatches) {
            this.highGet = this.totalPatches;
            this.highShow = this.highGet - this.lowGet;
          }

          this.getLatestPatches(this.lowGet, this.highGet);
        }
      }
    } 
    this.visiblePatches = this.patches.slice(this.lowShow, this.highShow);
    /* console.log(`lowGet: ${this.lowGet} highGet: ${this.highGet}`);
    console.log(`lowShow: ${this.lowShow} highShow: ${this.highShow}`);
    console.log(event); */

    return event;
  }

}
