import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { TokenStorageService } from 'src/app/services/token-storage.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    currentUser: any;
  
    constructor(private token: TokenStorageService, private http: HttpClient) { }
  
    ngOnInit(): void {
      this.currentUser = this.token.getUser();
      console.log(this.currentUser)
    }
  }
