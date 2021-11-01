import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Patch } from '../interfaces/patch';
import { PATCHES } from '../mock-patches';


@Injectable({
  providedIn: 'root'
})
export class PatchService {

  constructor(
    private http: HttpClient
  ) { }

  /*
  getPatches(): Observable<Patch[]> {
    const patches = of(PATCHES);
    return patches;
  }
  */

  getPatches(): Observable<any> {
    return this.http.get('/api/patches');
  }

  getPatch(id: number): Observable<Patch> {
    const patch = PATCHES.find(patch => patch.id === id)!;
    if(patch.modmatrix == []) {
      patch.modmatrix
    }
    return of(patch);
  }

}


