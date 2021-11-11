import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { jqxKnobModule } from 'jqwidgets-ng/jqxknob';
import { jqxSliderModule } from 'jqwidgets-ng/jqxslider';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ControlsComponent } from './components/controls/controls.component';
import { EnvelopeComponent } from './components/envelope/envelope.component';
import { FilterComponent } from './components/filter/filter.component';
import { KnobComponent } from './components/knob/knob.component';
import { LfoComponent } from './components/lfo/lfo.component';
import { ModMatrixComponent } from './components/mod-matrix/mod-matrix.component';
import { OctaveComponent } from './components/octave/octave.component';
import { OscillatorComponent } from './components/oscillator/oscillator.component';
import { PatchDetailComponent } from './components/patch-detail/patch-detail.component';
import { PatchInfoComponent } from './components/patch-info/patch-info.component';
import { PatchListComponent } from './components/patch-list/patch-list.component';
import { SequencerComponent } from './components/sequencer/sequencer.component';
import { SliderComponent } from './components/slider/slider.component';
import { ToggleComponent } from './components/toggle/toggle.component';
import { VolumeComponent } from './components/volume/volume.component';
import { HttpErrorInterceptorService } from './services/http-error-interceptor.service';
import { PatchComponent } from './components/patch/patch.component';

@NgModule({
  declarations: [
    AppComponent,
    PatchListComponent,
    PatchDetailComponent,
    KnobComponent,
    PatchInfoComponent,
    ToggleComponent,
    SliderComponent,
    OctaveComponent,
    OscillatorComponent,
    FilterComponent,
    ModMatrixComponent,
    VolumeComponent,
    ControlsComponent,
    LfoComponent,
    EnvelopeComponent,
    SequencerComponent,
    PatchComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    jqxKnobModule,
    jqxSliderModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptorService,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
