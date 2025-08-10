import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Placeholder component - will be implemented by Agent 3
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: UserListComponent }
    ])
  ]
})
export class UserManagementModule { }

// Temporary stub component
class UserListComponent { }