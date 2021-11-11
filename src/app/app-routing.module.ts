import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatchDetailComponent } from './components/patch-detail/patch-detail.component';
import { PatchListComponent } from './components/patch-list/patch-list.component';

const routes: Routes = [
  { path: 'patches', component: PatchListComponent },
  { path: 'patches/:id', component: PatchDetailComponent },
  { path: '', redirectTo: '/patches', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }