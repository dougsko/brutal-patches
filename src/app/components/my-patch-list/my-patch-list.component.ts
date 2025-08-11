import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { Patch } from 'src/app/interfaces/patch';
import { PatchService } from 'src/app/services/patch.service';
import { TokenStorageService } from 'src/app/services/token-storage.service';

@Component({
  selector: 'my-patch-list',
  templateUrl: './my-patch-list.component.html',
  styleUrls: ['./my-patch-list.component.scss']
})
export class MyPatchListComponent implements OnInit, OnDestroy {
  patches: Patch[] = [];
  selectedPatch?: Patch;
  private subs: Subscription[] = [];
  isLoading = false;
  hasMore = true;
  nextCursor?: string;
  isLoggedIn = false;

  constructor(private patchService: PatchService, private tokenStorage: TokenStorageService) {
   }

  ngOnInit(): void {
    if (this.tokenStorage.getToken()) {
      this.isLoggedIn = true;
      this.loadInitialPatches();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach( sub => {
      sub.unsubscribe();
    });
  }

  loadInitialPatches(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    let patchSub = this.patchService.getMyPatchesCursor(25).subscribe({
      next: (response) => {
        this.patches = response.patches;
        this.nextCursor = response.nextCursor;
        this.hasMore = response.hasMore;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading my patches:', error);
        this.isLoading = false;
      }
    });
    this.subs.push(patchSub);
  }

  loadMorePatches(): void {
    if (this.isLoading || !this.hasMore || !this.nextCursor) return;
    
    this.isLoading = true;
    let patchSub = this.patchService.getMyPatchesCursor(25, this.nextCursor).subscribe({
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
    this.subs.push(patchSub);
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    const scrollPosition = window.pageYOffset;
    const windowSize = window.innerHeight;
    const bodyHeight = document.body.offsetHeight;
    
    if (scrollPosition + windowSize >= bodyHeight - 200) {
      this.loadMorePatches();
    }
  }

}
