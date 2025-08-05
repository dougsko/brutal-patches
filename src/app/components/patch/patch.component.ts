import { Location } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Patch } from 'src/app/interfaces/patch';
import { PatchService } from '../../services/patch.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { PatchDetailComponent } from '../patch-detail/patch-detail.component';

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
  
  @ViewChild(PatchDetailComponent) patchDetailComponent!: PatchDetailComponent;

  constructor(
    private route: ActivatedRoute,
    private patchService: PatchService,
    private location: Location,
    private tokenStorageService: TokenStorageService
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
    const idParam = this.route.snapshot.paramMap.get('id');
    console.log('getPatch called with idParam:', idParam);
    
    if (idParam === 'new') {
      // Create a new patch with default values
      console.log('Creating new patch');
      try {
        this.patch = this.createNewPatch();
        console.log('New patch created successfully:', this.patch);
      } catch (error) {
        console.error('Failed to create new patch:', error);
      }
    } else {
      const id = Number(idParam);
      console.log('Fetching existing patch with id:', id);
      this.patchSub = this.patchService.getPatch(id).subscribe({
        next: (patch) => {
          this.patch = patch;
        },
        error: (error) => {
          console.error('Error fetching patch:', error);
        }
      });
      this.subs.push(this.patchSub);
    }
  }
  
  savePatch(): void {
    this.saveSub = this.patchService.savePatch(this.patch).subscribe({
      next: (savedPatch) => {
        console.log('Patch saved:', savedPatch);
        // Update the local patch with the returned data (includes new ID for new patches)
        this.patch = savedPatch;
        // Update URL if this was a new patch
        if (this.route.snapshot.paramMap.get('id') === 'new') {
          this.location.replaceState(`/patch/${savedPatch.id}`);
        }
        this.patchDetailComponent?.onSaveComplete(true);
      },
      error: (error) => {
        console.error('Error saving patch:', error);
        let errorMessage = 'Error saving patch';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.patchDetailComponent?.onSaveComplete(false, errorMessage);
      }
    });
    this.subs.push(this.saveSub);
  }

  private createNewPatch(): Patch {
    console.log('createNewPatch() called');
    try {
      const user = this.tokenStorageService.getUser();
      console.log('User from token storage:', user);
      const now = new Date().toISOString();
    
    return {
      id: 0, // Will be assigned by backend
      title: 'New Patch',
      description: '',
      sub_fifth: 0,
      overtone: 0,
      ultra_saw: 0,
      saw: 0,
      pulse_width: 0,
      square: 0,
      metalizer: 0,
      triangle: 0,
      cutoff: 0,
      mode: 0,
      resonance: 0,
      env_amt: 0,
      brute_factor: 0,
      kbd_tracking: 0,
      modmatrix: [],
      octave: 0,
      volume: 0,
      glide: 0,
      mod_wheel: 0,
      amount: 0,
      wave: 0,
      rate: 0,
      sync: 0,
      env_amt_2: 0,
      vca: 0,
      attack: 0,
      decay: 0,
      sustain: 0,
      release: 0,
      pattern: 0,
      play: 0,
      rate_2: 0,
      created_at: now,
      updated_at: now,
      average_rating: '0',
      tags: [],
      username: user?.username || ''
    };
    } catch (error) {
      console.error('Error in createNewPatch:', error);
      throw error;
    }
  }

}
