import { Component, Input, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Patch } from '../interfaces/patch';
import { PatchService } from '../services/patch.service';

@Component({
  selector: 'patch-detail',
  templateUrl: './patch-detail.component.html',
  styleUrls: ['./patch-detail.component.scss']
})
export class PatchDetailComponent implements OnInit {
  @Input() patch?: Patch;

  constructor(
    private route: ActivatedRoute,
    private patchService: PatchService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.getPatch();
  }

  getPatch(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.patchService.getPatch(id).subscribe( patch => {
      this.patch = patch
    });
  }

  updateInfo(metaInfo: any) {
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
  }

}
