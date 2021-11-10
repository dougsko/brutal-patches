import { Component, Input, OnInit } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'lfo',
  templateUrl: './lfo.component.html',
  styleUrls: ['./lfo.component.scss']
})
export class LfoComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
