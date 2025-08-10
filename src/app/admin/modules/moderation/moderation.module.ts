import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Placeholder component - will be implemented by Agent 3
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'queue', pathMatch: 'full' },
      { path: 'queue', component: ModerationQueueComponent }
    ])
  ]
})
export class ModerationModule { }

// Temporary stub component
class ModerationQueueComponent { }