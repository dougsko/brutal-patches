import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatchListComponent } from './components/patch-list/patch-list.component';
import { PatchComponent } from './components/patch/patch.component';

const routes: Routes = [
  { path: 'patches', component: PatchListComponent },
  { path: 'patches/:id', component: PatchComponent },
  { path: '', redirectTo: '/patches', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }