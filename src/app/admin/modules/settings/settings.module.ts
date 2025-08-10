import { NgModule, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Temporary stub component - will be implemented by Agent 3
@Component({
  template: '<div>System Settings - Implementation pending</div>'
})
class SystemSettingsComponent { }

@NgModule({
  declarations: [SystemSettingsComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'system', pathMatch: 'full' },
      { path: 'system', component: SystemSettingsComponent }
    ])
  ]
})
export class SettingsModule { }