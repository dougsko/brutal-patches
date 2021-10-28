import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PatchComponent } from './patch/patch.component';
import { PatchDetailComponent } from './patch-detail/patch-detail.component';

@NgModule({
  declarations: [
    AppComponent,
    PatchComponent,
    PatchDetailComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
