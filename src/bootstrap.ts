import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

export const bootstrap = (): ReturnType<typeof bootstrapApplication> => bootstrapApplication(App, appConfig);
