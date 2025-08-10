import { NgModule, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Temporary stub component - will be implemented by Agent 3
@Component({
  template: '<div>User List - Implementation pending</div>'
})
class UserListComponent { }

@NgModule({
  declarations: [UserListComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: UserListComponent }
    ])
  ]
})
export class UserManagementModule { }