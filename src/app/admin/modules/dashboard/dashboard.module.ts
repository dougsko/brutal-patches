import { NgModule, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Temporary stub component - will be implemented by Agent 2
@Component({
  template: '<div>Dashboard Overview - Implementation pending</div>'
})
class DashboardOverviewComponent { }

@NgModule({
  declarations: [DashboardOverviewComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: DashboardOverviewComponent }
    ])
  ]
})
export class DashboardModule { }