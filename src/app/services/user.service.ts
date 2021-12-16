import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const USERS_API = `${environment.apiUrl}/api/users/`
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  getUserByUsername(username: string): Observable<any> {
    return this.http.get(USERS_API + 'getUserByUsername/' + username, httpOptions);
  }

  create(username: string, email: string, password: string): Observable<any> {
    return this.http.post(USERS_API + 'create', {
      username,
      email,
      password
    }, httpOptions);
  }
}
