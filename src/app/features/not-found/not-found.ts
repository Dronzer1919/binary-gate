import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  styles: `
    :host {
      display: block;
      padding-block: 3rem;
    }
  `,
  template: `
    <div class="container">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <a routerLink="/">Back to the home page</a>
    </div>
  `,
})
export class NotFound {}
