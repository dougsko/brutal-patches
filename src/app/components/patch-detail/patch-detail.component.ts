import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'patch-detail',
  templateUrl: './patch-detail.component.html',
  styleUrls: ['./patch-detail.component.scss']
})
export class PatchDetailComponent implements OnInit {
  @Input() patch!: Patch;
  @Output() save = new EventEmitter<void>();
  saveMessage: string = '';

  constructor() { }

  ngOnInit(): void {
  }

  savePatch(): void {
    if (!this.patch.title || this.patch.title.trim() === '') {
      this.saveMessage = 'Error: Patch title is required';
      setTimeout(() => this.saveMessage = '', 3000);
      return;
    }
    
    this.saveMessage = 'Saving...';
    this.save.emit();
  }

  onSaveComplete(success: boolean, message?: string): void {
    if (success) {
      this.saveMessage = 'Patch saved successfully!';
    } else {
      this.saveMessage = message || 'Error saving patch';
    }
    setTimeout(() => this.saveMessage = '', 3000);
  }
}
