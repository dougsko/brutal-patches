import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { jqxKnobModule } from 'jqwidgets-ng/jqxknob';
import { jqxSliderModule } from 'jqwidgets-ng/jqxslider';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ControlsComponent } from './components/controls/controls.component';
import { EnvelopeComponent } from './components/envelope/envelope.component';
import { FilterComponent } from './components/filter/filter.component';
import { LfoComponent } from './components/lfo/lfo.component';
import { ModMatrixComponent } from './components/mod-matrix/mod-matrix.component';
import { OscillatorComponent } from './components/oscillator/oscillator.component';
import { PatchInfoComponent } from './components/patch-info/patch-info.component';
import { SequencerComponent } from './components/sequencer/sequencer.component';
import { VolumeComponent } from './components/volume/volume.component';
import { KnobComponent } from './knob/knob.component';
import { OctaveComponent } from './octave/octave.component';
import { PatchDetailComponent } from './patch-detail/patch-detail.component';
import { PatchComponent } from './patch/patch.component';
import { HttpErrorInterceptorService } from './services/http-error-interceptor.service';
import { SliderComponent } from './slider/slider.component';
import { ToggleComponent } from './toggle/toggle.component';



@NgModule({
  declarations: [
    AppComponent,
    PatchComponent,
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
    SequencerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    jqxKnobModule,
    jqxSliderModule,
    HttpClientModule,
    BrowserAnimationsModule
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
