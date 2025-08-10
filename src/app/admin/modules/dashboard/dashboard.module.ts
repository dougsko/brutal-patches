import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Placeholder component - will be implemented by Agent 2
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: DashboardOverviewComponent }
    ])
  ]
})
export class DashboardModule { }

// Temporary stub component
class DashboardOverviewComponent { }