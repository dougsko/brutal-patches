import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from '../interfaces/patch';

@Component({
  selector: 'toggle',
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss']
})
export class ToggleComponent implements OnInit {
  @Input() name!: string;
  @Input() max!: string;
  @Input() patch!: Patch;
  @Input() lower!: string;
  @Output() newValueEvent = new EventEmitter<Patch>();

  label!: string;
  //value!: number;
  min_data!: number;
  max_data!: number;

  constructor() { }

  ngOnInit(): void {
    this.label = this.formatName(this.name);

    this.max_data = parseInt(this.max);
  }

  formatName(name: string): string {
    if(name === "vca") {
      return name.toUpperCase();
    }
    let words: string[] = [];
    for(let word of name.split("_")) {
      words.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
    return words.join(" ");
  }

  moveToggle(event: any) {
    //this.value = event.args.value;
    this.patch[this.name] = event.args.value; //this.value;
    this.newValueEvent.emit(this.patch);
  }

}
