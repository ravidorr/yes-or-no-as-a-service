# Privacy Policy

YESorNOaaS is a small open source project. This policy describes how the project handles personal data.

## Summary

YESorNOaaS does not require accounts, sell personal data, or use advertising
trackers. Operators can optionally enable Pendo analytics for a deployment by
configuring `PENDO_PUBLIC_APP_ID`.

The web UI can report a small set of product analytics events to
[Pendo](https://www.pendo.io/) when that deployment enables Pendo. See
[Product analytics](#product-analytics) for what those events contain.

## What YESorNOaaS does

When you run YESorNOaaS locally or deploy it yourself, the service responds to requests with plain text output. Request content is handled in memory to produce that response and is not persisted by the application.

Shared links include the request text in the URL query string. Browser history,
referrer headers, proxy logs, and similar infrastructure may retain that URL.

## Optional Pendo analytics

When an operator configures `PENDO_PUBLIC_APP_ID`, the web UI loads Pendo to
record anonymous page and interaction usage. Pendo creates or reuses an
anonymous browser identifier through first-party cookies or local storage.

Pendo is disabled by default. It is not included in local development, CI, or
self-hosted deployments unless the operator explicitly configures
`PENDO_PUBLIC_APP_ID`.

The Pendo configuration excludes the `request` query parameter and ignores the
share controls containing shared-link URLs, so question text is not sent to
Pendo through captured URLs or share interactions.

## User-initiated sharing

The web UI can generate share links and open third-party destinations such as
X, Facebook, LinkedIn, email, and WhatsApp. Those actions happen only when a
user clicks a share control. The destination provider then receives the share
URL and any text included in that link according to its own policies.

YESorNOaaS does not send that data to those providers automatically.

## Product analytics

The web UI sends these events through the Pendo agent's `pendo.track()` API:

- `question_answered`: an answer was shown for a question you typed
- `shared_link_replay_completed`: a shared link finished replaying its answer
- `answer_request_failed`: an answer request timed out or failed
- `share_link_copied`: a share link was copied to the clipboard
- `share_link_copy_failed`: copying a share link failed

Event properties are limited to the page mode (`yes`, `no`, or `random`), the
answer shown, the question length in characters, the response time, the error
kind, HTTP status, and error type name, whether the clipboard API was
available, whether the answer came from your own question or a shared link, and
whether a shared link was opened from inside or outside the site. Event
properties never include question text, share URLs, or referrer URLs.

When configured with `PENDO_PUBLIC_APP_ID`, the app loads the Pendo agent and
these events are sent. Pendo also records page URLs, page views, and
interactions such as clicks, and stores a visitor identifier in the browser,
under that operator's and Pendo's policies. The Pendo configuration excludes
the `request` query parameter from captured URLs and ignores share controls
containing shared-link URLs, so question text is not sent through captured URLs
or share interactions.

## What we do not do

YESorNOaaS does not and will not:

- require user accounts
- collect names, email addresses, or contact details
- include question text, share URLs, or referrer URLs in analytics event properties
- set tracking cookies or local storage unless an operator enables Pendo
- sell personal data to third parties

## Third-party services

This repository is hosted on GitHub. GitHub may process data according to its own policies when you browse the repository, open issues, or submit pull requests. That processing is governed by GitHub, not by YESorNOaaS.

If you deploy YESorNOaaS to your own infrastructure, your hosting provider's policies apply to that deployment.

## Operational metrics

Self-hosted operators may scrape `GET /metrics` for operational monitoring (CPU,
memory, HTTP request counts, and similar runtime signals). That telemetry
describes the service process, not individual users or request content
persisted by the application.

## Changes

If this policy changes, the update will be committed to this repository.

## Contact

Questions about privacy can be raised in [GitHub issues](https://github.com/ravidorr/yes-or-no-as-a-service/issues).
