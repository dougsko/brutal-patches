import { Component, Input, OnInit } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'oscillator',
  templateUrl: './oscillator.component.html',
  styleUrls: ['./oscillator.component.scss']
})
export class OscillatorComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
