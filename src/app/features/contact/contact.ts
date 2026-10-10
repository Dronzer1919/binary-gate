import { DOCUMENT } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { SITE_CONFIG } from '../../core/config/app-config';
import { FormField, Icon, Radio, RadioGroup, TextArea, TextInput } from '../../shared';

type StatusKind = 'success' | 'error' | '';

/**
 * Static-site friendly: no backend. A valid submission opens the visitor's email client with the
 * enquiry pre-filled. Swap `send()` for a fetch() to a form service if you add one.
 */
@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormField, TextInput, TextArea, RadioGroup, Radio, Icon],
  styleUrl: './contact.scss',
  template: `
    <section class="page section--alt" aria-labelledby="contact-title">
      <div class="container split split--form">
        <div>
          <p class="eyebrow annot">
            <span class="annot__dot"></span>04 / Contact<span class="annot__line"></span>
          </p>
          <h1 id="contact-title" class="h2">Tell us what you need.</h1>
          <p class="lead">Send a few details and a specialist will reply with a quote within one business day.</p>
          <ul class="contact-list">
            <li><app-icon name="mail" /><a [href]="'mailto:' + email">{{ email }}</a></li>
            <li><app-icon name="phone" /><a href="tel:+15550100142">+1&nbsp;555&nbsp;010&nbsp;0142</a></li>
            <li><app-icon name="pin" /><span>100 Example Street, Sampletown</span></li>
          </ul>
        </div>

        <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-form-field label="Full name" [control]="form.controls.name" [messages]="{ required: 'Enter your full name.' }">
            <app-input autocomplete="name" name="name" [formControl]="form.controls.name" />
          </app-form-field>

          <app-form-field
            label="Work email"
            hint="We only use this to reply to your enquiry."
            [control]="form.controls.email"
            [messages]="{ required: 'Enter your work email.' }"
          >
            <app-input type="email" autocomplete="email" name="email" [formControl]="form.controls.email" />
          </app-form-field>

          <app-form-field
            label="Phone (optional)"
            [control]="form.controls.phone"
            [messages]="{ pattern: 'Use digits, spaces, + ( ) or - only (7 to 20 characters).' }"
          >
            <app-input type="tel" autocomplete="tel" inputmode="tel" name="phone" [formControl]="form.controls.phone" />
          </app-form-field>

          <app-form-field
            label="I am interested in"
            [group]="true"
            [control]="form.controls.topic"
            [messages]="{ required: 'Choose a topic.' }"
          >
            <app-radio-group [inline]="true" [formControl]="form.controls.topic">
              @for (topic of topics; track topic) {
                <app-radio [value]="topic">{{ topic }}</app-radio>
              }
            </app-radio-group>
          </app-form-field>

          <app-form-field
            label="How can we help?"
            [control]="form.controls.message"
            [messages]="{ required: 'Tell us what you need.', minlength: 'Please write at least 10 characters so we can help.' }"
          >
            <app-textarea name="message" [maxlength]="1000" [formControl]="form.controls.message" />
          </app-form-field>

          <button class="btn" type="submit">Send enquiry <app-icon name="arrow" /></button>
          <p class="status" role="status" [class.success]="statusKind() === 'success'" [class.error]="statusKind() === 'error'">
            {{ status() }}
          </p>
        </form>
      </div>
    </section>
  `,
})
export class Contact {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly email = inject(SITE_CONFIG).contactEmail;
  protected readonly topics = ['Hardware', 'Peripherals', 'Network', 'Software', 'Something else'] as const;

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.pattern(/^[0-9+()\-\s]{7,20}$/)],
    topic: ['', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });

  protected readonly status = signal('');
  protected readonly statusKind = signal<StatusKind>('');

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.status.set('Please fix the highlighted fields and try again.');
      this.statusKind.set('error');
      // After the error state has rendered, move focus to the first invalid control.
      afterNextRender(
        () => {
          this.host.nativeElement
            .querySelector<HTMLElement>('input[aria-invalid="true"], textarea[aria-invalid="true"], [role="radiogroup"][aria-invalid="true"] input')
            ?.focus();
        },
        { injector: this.injector },
      );
      return;
    }

    const { name, email, phone, topic, message } = this.form.getRawValue();
    const subject = encodeURIComponent(`Website enquiry: ${topic}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'n/a'}\n\n${message}`);
    this.status.set('Opening your email app with the message ready to send…');
    this.statusKind.set('success');
    const win = this.doc.defaultView;
    if (win) {
      win.location.href = `mailto:${this.email}?subject=${subject}&body=${body}`;
    }
  }
}
