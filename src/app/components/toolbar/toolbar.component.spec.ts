import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToolbarComponent } from './toolbar.component';
import { AuthService } from '../../services/auth.service';
import { TokenStorageService } from '../../services/token-storage.service';
import { EventBusService } from '../../services/event-bus.service';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(async () => {
    const mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };
    const mockTokenStorage = {
      getToken: jasmine.createSpy('getToken').and.returnValue(null),
      getUser: jasmine.createSpy('getUser').and.returnValue({}),
      signOut: jasmine.createSpy('signOut')
    };
    const mockEventBus = {
      on: jasmine.createSpy('on'),
      emit: jasmine.createSpy('emit')
    };

    await TestBed.configureTestingModule({
      declarations: [ ToolbarComponent ],
      imports: [ HttpClientTestingModule ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: EventBusService, useValue: mockEventBus },
        AuthService
      ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
