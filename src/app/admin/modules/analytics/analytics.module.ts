import { NgModule, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Temporary stub component - will be implemented by Agent 2
@Component({
  template: '<div>Analytics Overview - Implementation pending</div>'
})
class AnalyticsOverviewComponent { }

@NgModule({
  declarations: [AnalyticsOverviewComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: AnalyticsOverviewComponent }
    ])
  ]
})
export class AnalyticsModule { }