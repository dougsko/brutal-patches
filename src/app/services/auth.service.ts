import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const AUTH_API = `${environment.apiUrl}/api/auth/`;
const USERS_API = `${environment.apiUrl}/api/users/`

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<any> {
    return this.http.post(AUTH_API + 'login', {
      username,
      password
    }, httpOptions)
  }

  /* register(username: string, email: string, password: string): Observable<any> {
    return this.http.post(USERS_API + 'create', {
      username,
      email,
      password
    }, httpOptions);
  } */
}