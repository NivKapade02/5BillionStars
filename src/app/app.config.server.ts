import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting, RenderMode } from '@angular/ssr';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRouting([
      { path: '', renderMode: RenderMode.Prerender },
      { path: 'policies', renderMode: RenderMode.Prerender },
      { path: '**', renderMode: RenderMode.Client }
    ])
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
