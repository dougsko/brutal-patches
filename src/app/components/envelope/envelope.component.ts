import { Component, Input, OnInit } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'envelope',
  templateUrl: './envelope.component.html',
  styleUrls: ['./envelope.component.scss']
})
export class EnvelopeComponent implements OnInit {
  @Input() patch!: Patch;

  constructor() { }

  ngOnInit(): void {
  }

}
