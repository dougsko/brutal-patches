import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Patch } from 'server-src/dist/interfaces/patch';
import { PatchService } from '../../services/patch.service';

@Component({
  selector: 'patch-detail',
  templateUrl: './patch-detail.component.html',
  styleUrls: ['./patch-detail.component.scss']
})
export class PatchDetailComponent implements OnInit, OnDestroy {
  patch!: Patch;
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

}