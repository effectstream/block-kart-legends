import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://5d3dcd6d9c584426920d1a259640126b@o4511139782590464.ingest.us.sentry.io/4511139791306752",
  environment: import.meta.env.MODE,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Tracing
  tracesSampleRate: 1.0, // Lower to 0.1–0.2 in production
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/api-blockkart\.paimastudios\.com/,
    /^https:\/\/batcher-blockkart\.paimastudios\.com/,
    /^https:\/\/blockkart\.midnight\.fun/,
    /^https:\/\/batcher\.blockkart\.midnight\.fun/,
  ],

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
