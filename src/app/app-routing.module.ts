import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MyPatchListComponent } from './components/my-patch-list/my-patch-list.component';
import { PatchListComponent } from './components/patch-list/patch-list.component';
import { PatchComponent } from './components/patch/patch.component';

const routes: Routes = [
  { path: 'patches', component: PatchListComponent },
  { path: '', redirectTo: '/patches', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
