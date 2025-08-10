import { NgModule, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Temporary stub component - will be implemented by Agent 3
@Component({
  template: '<div>Moderation Queue - Implementation pending</div>'
})
class ModerationQueueComponent { }

@NgModule({
  declarations: [ModerationQueueComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'queue', pathMatch: 'full' },
      { path: 'queue', component: ModerationQueueComponent }
    ])
  ]
})
export class ModerationModule { }