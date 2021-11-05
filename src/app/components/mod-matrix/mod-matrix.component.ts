import { Component, OnInit } from '@angular/core';
import { jsPlumb } from 'jsplumb';

@Component({
  selector: 'mod-matrix',
  templateUrl: './mod-matrix.component.html',
  styleUrls: ['./mod-matrix.component.scss']
})
export class ModMatrixComponent implements OnInit {
  jsPlumbInstance = jsPlumb.getInstance();

  constructor() { }

  ngOnInit(): void {
  }

}
