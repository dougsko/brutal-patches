import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// Shared Admin Material Module
import { AdminMaterialModule } from '../../shared/admin-material.module';
import { AdminSharedModule } from '../../shared/admin-shared.module';

// Additional Material Modules not covered by shared module
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

// Components
import { UserListComponent } from './components/user-list/user-list.component';

@NgModule({
  declarations: [
    UserListComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    
    // Shared Material Modules
    AdminMaterialModule,
    AdminSharedModule,
    
    // Additional specific Material Modules
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatBadgeModule,
    MatDividerModule,
    
    RouterModule.forChild([
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: UserListComponent },
      { path: 'edit/:id', loadChildren: () => import('./components/user-edit/user-edit.module').then(m => m.UserEditModule) }
    ])
  ]
})
export class UserManagementModule { }