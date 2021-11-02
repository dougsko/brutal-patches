import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators'
import { Patch } from '../interfaces/patch';


@Injectable({
  providedIn: 'root'
})
export class PatchService {

  constructor(
    private http: HttpClient
  ) { }

  getPatches(): Observable<any> {
    return this.http.get('/api/patches').pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }

  getPatch(id: number): Observable<any|Patch> {
    return this.http.get(`/api/patches/${id}`).pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }
}



