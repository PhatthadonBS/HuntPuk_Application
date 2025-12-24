import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingState {
  private loadingState = new BehaviorSubject<boolean>(false);

  loading$ = this.loadingState.asObservable();

  changeState(state: boolean){
    this.loadingState.next(state);
  }
}
