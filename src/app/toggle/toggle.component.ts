import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'toggle',
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss']
})
export class ToggleComponent implements OnInit {
  @Input() name!: string;
  @Input() min!: string;
  @Input() max!: string;
  @Input() value!: string;
  @Input() lower!: string;
  @Output() newValueEvent = new EventEmitter<any>();

  label!: string;
  value_data!: number;
  min_data!: number;
  max_data!: number;

  constructor() { }

  ngOnInit(): void {
    this.label = this.name.charAt(0).toUpperCase() + this.name.slice(1);

    if (this.value) {
      this.value_data = parseInt(this.value);
    }

    if(this.min) {
      this.min_data = parseInt(this.min);
    }
  
    if(this.max) {
      this.max_data = parseInt(this.max);
    }

  }

  moveSlider(event: any) {
    this.value = event.args.value;
    this.newValueEvent.emit({field: this.name, value: this.value});
  }

}
