import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Placeholder component - will be implemented by Agent 3
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'system', pathMatch: 'full' },
      { path: 'system', component: SystemSettingsComponent }
    ])
  ]
})
export class SettingsModule { }

// Temporary stub component
class SystemSettingsComponent { }