import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Patch } from 'src/app/interfaces/patch';
import { PatchService } from '../../services/patch.service';

@Component({
  selector: 'patch',
  templateUrl: './patch.component.html',
  styleUrls: ['./patch.component.scss']
})
export class PatchComponent implements OnInit {
  patch!: Patch;
  private patchSub!: Subscription;
  private saveSub!: Subscription;
  private subs: Subscription[] = []

  constructor(
    private route: ActivatedRoute,
    private patchService: PatchService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.getPatch();
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => {
      sub.unsubscribe()
    });
  }

  getPatch(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.patchSub = this.patchService.getPatch(id).subscribe( patch => {
      this.patch = patch;
    });
    this.subs.push(this.patchSub);
  }
  
  savePatch(): void {
    console.log("SJKDHSFKJHFKJDHF")
    this.saveSub = this.patchService.savePatch(this.patch).subscribe( res => {
      console.log(res);
    });
    this.subs.push(this.saveSub);
  }

}
