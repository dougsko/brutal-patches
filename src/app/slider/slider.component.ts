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
  @Output() newValueEvent = new EventEmitter<any>();

  constructor() { }

  ngOnInit(): void {
  }

  moveSlider(event: any) {
    this.value = event.args.value;
    this.newValueEvent.emit({field: this.name, value: this.value});
  }

}
