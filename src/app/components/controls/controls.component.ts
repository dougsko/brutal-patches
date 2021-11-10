import { Component, Input, OnInit } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'controls',
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.scss']
})
export class ControlsComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
