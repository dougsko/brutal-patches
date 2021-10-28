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
  
}


