import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PatchDetailComponent } from './patch-detail/patch-detail.component';
import { PatchComponent } from './patch/patch.component' 

const routes: Routes = [
  { path: 'patches', component: PatchComponent },
  { path: 'patches/:id', component: PatchDetailComponent },
  { path: '', redirectTo: '/patches', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }