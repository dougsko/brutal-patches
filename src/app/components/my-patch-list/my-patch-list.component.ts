import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { Patch } from 'src/app/interfaces/patch';
import { PatchService } from 'src/app/services/patch.service';
import { TokenStorageService } from 'src/app/services/token-storage.service';

@Component({
  selector: 'my-patch-list',
  templateUrl: './my-patch-list.component.html',
  styleUrls: ['./my-patch-list.component.scss']
})
export class MyPatchListComponent implements OnInit {
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
  myPatchTotal: number = 0;
  isLoggedIn = false;

  constructor(private patchService: PatchService, private tokenStorage: TokenStorageService) {
   }

  ngOnInit(): void {
    this.getPatchTotal();
    this.getMyPatches(0, 100);
    if (this.tokenStorage.getToken()) {
      this.isLoggedIn = true;
      this.getMyPatchTotal();
    }
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
    });
  }

  getMyPatches(first: number, last: number): void {
    this.patchSub = this.patchService.getMyPatches(first, last).subscribe( patches => {
      this.patches = patches;
      this.visiblePatches = this.patches.slice(this.lowShow, this.highShow);
    });
  }

  getPatchTotal(): void {
    this.patchSub = this.patchService.getPatchTotal().subscribe( total => {
      this.totalPatches = total;
    });
  }

  getMyPatchTotal(): void {
    this.patchSub = this.patchService.getMyPatchTotal().subscribe( total => {
      this.myPatchTotal = total;
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
        this.getMyPatches(this.lowGet, this.highGet);
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
          this.getMyPatches(this.lowGet, this.highGet);
        }
      }
    } else if (event.pageIndex - event.previousPageIndex! > 0) {
      if (event.pageIndex - event.previousPageIndex! > 1) {
        // console.log("big jump forward");
        this.lowShow = 75;
        this.highShow = 100;
        this.highGet = this.totalPatches;
        this.lowGet = this.highGet - 100;
        this.getMyPatches(this.lowGet, this.highGet);
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
            this.highGet = this.myPatchTotal;
            this.highShow = this.highGet - this.lowGet;
          }

          this.getMyPatches(this.lowGet, this.highGet);
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
