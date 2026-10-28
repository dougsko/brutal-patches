import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { MyPatchListComponent } from './components/my-patch-list/my-patch-list.component';
import { PatchListComponent } from './components/patch-list/patch-list.component';
import { PatchComponent } from './components/patch/patch.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'patches', component: PatchListComponent },
  { path: 'my-patches', component: MyPatchListComponent, canActivate: [AuthGuard] },
  { path: 'patch/new', component: PatchComponent, canActivate: [AuthGuard] },
  { path: 'patch/:id', component: PatchComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: '/patches', pathMatch: 'full' },
  { path: 'login', component: LoginComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
