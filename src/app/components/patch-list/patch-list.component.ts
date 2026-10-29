import { Component, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { TokenStorageService } from 'src/app/services/token-storage.service';
import { Patch } from '../../interfaces/patch';
import { PatchService } from '../../services/patch.service';

@Component({
  selector: 'patch-list',
  imports: [CommonModule, RouterModule, MatCardModule, MatChipsModule, MatProgressSpinnerModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './patch-list.component.html',
  styleUrls: ['./patch-list.component.scss'],
})
export class PatchListComponent implements OnInit, OnDestroy {
  patches: Patch[] = [];
  selectedPatch?: Patch;
  private patchSub!: Subscription;
  isLoading = false;
  hasMore = true;
  nextCursor?: string;
  isLoggedIn = false;

  constructor(private patchService: PatchService, private tokenStorageService: TokenStorageService) {
   }

  ngOnInit(): void {
    this.loadInitialPatches();
  }

  ngOnDestroy(): void {
    if (this.patchSub) {
      this.patchSub.unsubscribe();
    }
  }

  loadInitialPatches(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.patchSub = this.patchService.getLatestPatchesCursor(25).subscribe({
      next: (response) => {
        this.patches = response.patches;
        this.nextCursor = response.nextCursor;
        this.hasMore = response.hasMore;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading patches:', error);
        this.isLoading = false;
      }
    });
  }

  loadMorePatches(): void {
    if (this.isLoading || !this.hasMore || !this.nextCursor) return;
    
    this.isLoading = true;
    this.patchSub = this.patchService.getLatestPatchesCursor(25, this.nextCursor).subscribe({
      next: (response) => {
        this.patches = [...this.patches, ...response.patches];
        this.nextCursor = response.nextCursor;
        this.hasMore = response.hasMore;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading more patches:', error);
        this.isLoading = false;
      }
    });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event): void {
    const scrollPosition = window.pageYOffset;
    const windowSize = window.innerHeight;
    const bodyHeight = document.body.offsetHeight;
    
    if (scrollPosition + windowSize >= bodyHeight - 200) {
      this.loadMorePatches();
    }
  }

}
