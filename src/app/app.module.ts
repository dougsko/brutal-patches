import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { jqxKnobModule } from 'jqwidgets-ng/jqxknob';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PatchComponent } from './patch/patch.component';
import { PatchDetailComponent } from './patch-detail/patch-detail.component';
import { KnobComponent } from './knob/knob.component';
import { PatchInfoComponent } from './patch-info/patch-info.component';

@NgModule({
  declarations: [
    AppComponent,
    PatchComponent,
    PatchDetailComponent,
    KnobComponent,
    PatchInfoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    jqxKnobModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
