import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MyPatchListComponent } from './components/my-patch-list/my-patch-list.component';
import { PatchListComponent } from './components/patch-list/patch-list.component';
import { PatchComponent } from './components/patch/patch.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RegisterComponent } from './components/register/register.component';

const routes: Routes = [
  { path: 'patches', component: PatchListComponent },
  { path: 'patches/:username', component: MyPatchListComponent },
  { path: 'patch/:id',  component: PatchComponent },
  { path: '', redirectTo: '/patches', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }