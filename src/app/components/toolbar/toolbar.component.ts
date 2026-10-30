import { Component, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { EventBusService } from 'src/app/services/event-bus.service';

@Component({
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  imports: [MatToolbarModule],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  username?: string;
  eventBusSub?: Subscription;

  constructor(private router: Router, private authService: AuthService, private eventBusService: EventBusService) {}

  ngOnInit(): void {
    const user = this.authService.getUserFromCookie();
    if (user) {
      this.isLoggedIn = true;
      this.username = user.username || user.email;
    }
    this.eventBusSub = this.eventBusService.on('logout', () => this.logout());
  }

  ngOnDestroy(): void {
    if (this.eventBusSub) this.eventBusSub.unsubscribe();
  }

  logout(): void {
    this.isLoggedIn = false;
    this.username = undefined;
    this.router.navigate(['/']);
  }
}
