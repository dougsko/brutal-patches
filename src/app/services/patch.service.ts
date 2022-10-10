import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Patch } from '../interfaces/patch';

const PATCH_API = `${environment.apiUrl}/api/patches`

@Injectable({
  providedIn: 'root'
})
export class PatchService {

  constructor(
    private http: HttpClient
  ) { }

  getPatches(): Observable<any> {
    return this.http.get(PATCH_API).pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }

  getLatestPatches(first: number, last: number): Observable<any> {
    return this.http.get(`${PATCH_API}/${first}/${last}`).pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }

  getPatch(id: number): Observable<any|Patch> {
    return this.http.get(`${PATCH_API}/${id}`).pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }

  getPatchTotal(): Observable<any> {
    return this.http.get(`${PATCH_API}/total`).pipe(
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

  getUserPatchTotal(username: string): Observable<any> {
    return this.http.get(`${PATCH_API}/${username}/total`).pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }

  getUserPatches(username: string, first: number, last: number): Observable<any> {
    // console.log("Getting new patches")
    return this.http.get(`${environment.apiUrl}/api/patches/${username}/${first}/${last}`).pipe(
      catchError(err => {
        return throwError(err);
      })
    );
  }
}



