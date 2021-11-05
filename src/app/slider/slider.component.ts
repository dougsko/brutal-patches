import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from 'server-src/src/interfaces/patch';

@Component({
  selector: 'slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class SliderComponent implements OnInit {
  @Input() name!: string;
  @Input() patch!: Patch;
  @Output() newValueEvent = new EventEmitter<Patch>();

  label!: string;

  constructor() { }

  ngOnInit(): void {
    this.label = this.formatName(this.name);
    
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

  moveSlider(event: any) {
    this.patch[this.name] = event.args.value;
    this.newValueEvent.emit(this.patch);
  }

}
