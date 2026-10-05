# Privacy Policy

YESorNOaaS is a small open source project. This policy describes how the project handles personal data.

## Summary

YESorNOaaS does not collect, store, sell, or track end users in the application itself.

We do not use accounts, analytics, advertising trackers, or cookies for tracking
end users.

## What YESorNOaaS does

When you run YESorNOaaS locally or deploy it yourself, the service responds to requests with plain text output. Request content is handled in memory to produce that response and is not persisted by the application.

Shared links include the request text in the URL query string. Browser history,
referrer headers, proxy logs, and similar infrastructure may retain that URL.

## User-initiated sharing

The web UI can generate share links and open third-party destinations such as
X, Facebook, LinkedIn, email, and WhatsApp. Those actions happen only when a
user clicks a share control. The destination provider then receives the share
URL and any text included in that link according to its own policies.

YESorNOaaS does not send that data to those providers automatically.

## What we do not do

YESorNOaaS does not and will not:

- require user accounts
- collect names, email addresses, or contact details
- collect user analytics or behavioral telemetry in the application
- set tracking cookies
- sell personal data to third parties

## Third-party services

This repository is hosted on GitHub. GitHub may process data according to its own policies when you browse the repository, open issues, or submit pull requests. That processing is governed by GitHub, not by YESorNOaaS.

If you deploy YESorNOaaS to your own infrastructure, your hosting provider's policies apply to that deployment.

## Operational metrics

YESorNOaaS does not track users. Self-hosted operators may scrape `GET /metrics` for
operational monitoring (CPU, memory, HTTP request counts, and similar runtime
signals). That telemetry describes the service process, not individual users or
request content persisted by the application.

## Changes

If this policy changes, the update will be committed to this repository.

## Contact

Questions about privacy can be raised in [GitHub issues](https://github.com/ravidorr/yes-or-no-as-a-service/issues).
