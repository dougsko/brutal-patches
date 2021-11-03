import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Patch } from '../interfaces/patch';
import { PatchService } from '../services/patch.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'patch-detail',
  templateUrl: './patch-detail.component.html',
  styleUrls: ['./patch-detail.component.scss']
})
export class PatchDetailComponent implements OnInit, OnDestroy {
  @Input() patch?: Patch;
  private patchSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private patchService: PatchService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.getPatch();
  }

  ngOnDestroy(): void {
    this.patchSub.unsubscribe();
  }

  getPatch(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.patchSub = this.patchService.getPatch(id).subscribe( patch => {
      this.patch = patch
    });
  }

  updateInfo(metaInfo: any) {
    // console.log(metaInfo)
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
  }

}
