import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'slider',
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.scss']
})
export class SliderComponent implements OnInit {
  @Input() name!: string;
  @Input() min!: string;
  @Input() max!: string;
  @Input() value!: string;
  @Input() lower!: string;
  @Output() newValueEvent = new EventEmitter<any>();

  label!: string;

  constructor() { }

  ngOnInit(): void {
    this.label = this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }

  moveSlider(event: any) {
    this.value = event.args.value;
    this.newValueEvent.emit({field: this.name, value: this.value});
  }

}
