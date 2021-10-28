import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Patch } from '../interfaces/patch';
import { PATCHES } from '../mock-patches';


@Injectable({
  providedIn: 'root'
})
export class PatchService {

  constructor() { }

  getPatches(): Observable<Patch[]> {
    const patches = of(PATCHES);
    return patches;
  }

  getPatch(id: number): Observable<Patch> {
    const patch = PATCHES.find(patch => patch.id === id)!;
    if(patch.modmatrix == []) {
      patch.modmatrix
    }
    return of(patch);
  }

}


