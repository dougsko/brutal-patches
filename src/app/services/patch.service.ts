import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
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

  getLatestPatches(first: number, last: number): Observable<any> {
    return this.http.get(`api/patches/${first}/${last}`).pipe(
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

  getPatchTotal(): Observable<any> {
    return this.http.get(`/api/patches/total`).pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }

  savePatch(patch: Patch): Observable<any> {
    console.log("Saving patch: ")
    console.log(patch);
    return of("ok");
  }
}



