import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MyPatchListComponent } from './components/my-patch-list/my-patch-list.component';
import { PatchListComponent } from './components/patch-list/patch-list.component';
import { PatchComponent } from './components/patch/patch.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'patches', component: PatchListComponent },
  { path: 'my-patches', component: MyPatchListComponent },
  { path: 'patches/:username', component: MyPatchListComponent },
  { path: 'patch/new', component: PatchComponent },
  { path: 'patch/:id',  component: PatchComponent },
  { path: '', redirectTo: '/patches', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent },
  { 
    path: 'admin', 
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }