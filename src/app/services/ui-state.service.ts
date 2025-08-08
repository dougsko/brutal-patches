import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: {
    hasError: boolean;
    message?: string;
    details?: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  private loadingState$ = new BehaviorSubject<LoadingState>({});
  private errorState$ = new BehaviorSubject<ErrorState>({});

  constructor() {}

  // Loading state methods
  getLoadingState(): Observable<LoadingState> {
    return this.loadingState$.asObservable();
  }

  isLoading(key: string): Observable<boolean> {
    return new Observable(observer => {
      this.loadingState$.subscribe(state => {
        observer.next(state[key] || false);
      });
    });
  }

  setLoading(key: string, loading: boolean): void {
    const currentState = this.loadingState$.value;
    this.loadingState$.next({
      ...currentState,
      [key]: loading
    });
  }

  clearLoading(key: string): void {
    const currentState = { ...this.loadingState$.value };
    delete currentState[key];
    this.loadingState$.next(currentState);
  }

  // Error state methods
  getErrorState(): Observable<ErrorState> {
    return this.errorState$.asObservable();
  }

  getError(key: string): Observable<{ hasError: boolean; message?: string; details?: any }> {
    return new Observable(observer => {
      this.errorState$.subscribe(state => {
        observer.next(state[key] || { hasError: false });
      });
    });
  }

  setError(key: string, message?: string, details?: any): void {
    const currentState = this.errorState$.value;
    this.errorState$.next({
      ...currentState,
      [key]: {
        hasError: true,
        message,
        details
      }
    });
  }

  clearError(key: string): void {
    const currentState = { ...this.errorState$.value };
    delete currentState[key];
    this.errorState$.next(currentState);
  }

  clearAllErrors(): void {
    this.errorState$.next({});
  }

  // Utility methods for common operations
  async withLoadingState<T>(key: string, operation: () => Promise<T>): Promise<T> {
    this.setLoading(key, true);
    this.clearError(key);
    
    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      this.setError(key, error?.message || 'Operation failed', error);
      throw error;
    } finally {
      this.setLoading(key, false);
    }
  }

  handleHttpError(key: string, error: any): void {
    let message = 'An error occurred';
    
    if (error?.message) {
      message = error.message;
    } else if (error?.error?.message) {
      message = error.error.message;
    }

    this.setError(key, message, error);
    this.setLoading(key, false);
  }
}