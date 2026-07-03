# Phase 12: Content Studio → Make.com — Design Spec

**Status: blocked on information only the repo owner has. Not
implemented.**

## Context

`POST /api/content/distribute` is a 501 stub (confirmed by reading the
route directly): it checks auth, then unconditionally returns "Direct
social distribution not configured." `ContentStudio.tsx`'s UI still
references `MAKE_PUBLISH_WEBHOOK_URL` in its footer copy — but that env
var was deleted from Vercel in Phase 9 as confirmed dead code (nothing
reads it). There is no live Make.com scenario configured for this
feature today.

## Why this can't be built tonight

Implementing "real" distribution requires, at minimum:
1. A Make.com scenario that actually exists, built to receive a webhook
   and post to whichever channels (Telegram/Facebook/WhatsApp/Viber —
   the channels already linked from `JoinCommunity.tsx`, or others) the
   repo owner actually wants content distributed to.
2. That scenario's webhook URL.
3. The payload shape that scenario expects (field names, format).

None of this exists in any file in this repo, any env var, or anywhere
this session has access to. Building "something that looks like it
works" without a real scenario to send to would mean either fabricating
a fake success response (actively deceptive — worse than the current
honest 501) or guessing at a payload shape for a scenario that may not
even exist yet, wasting implementation effort on something that will
need to be redone once the real details are known.

## What's needed from the repo owner before this can be built

1. Does a Make.com scenario for this already exist, or does one need to
   be created? If it exists: the webhook URL and expected payload shape.
2. Which content/channels should `/api/content/distribute` actually post
   to — is this the same Telegram/Facebook/WhatsApp/Viber set already
   linked from the homepage's `JoinCommunity.tsx`, or something else
   (e.g., a different channel specific to "content" as opposed to job
   postings, which already have their own working publish flow via
   `/api/webhooks/publish-job`)?
3. What content does Content Studio actually distribute — is it the same
   shape as a job posting (title/company/description), or free-form
   text/image content authored in the Content Studio UI itself? (Worth
   checking `ContentStudio.tsx`'s form fields for what it already lets an
   admin author, before assuming.)

## Once that's answered — the shape of the fix

Given the answers above, the fix itself is mechanical and small: replace
the unconditional 501 in `/api/content/distribute` with a real `fetch()`
to the Make.com webhook URL (read from a new env var, e.g.
`MAKE_CONTENT_WEBHOOK_URL`, added back to Vercel — not the old, now-
deleted `MAKE_PUBLISH_WEBHOOK_URL`, a fresh name to avoid confusion with
the archived one), wrapped in the same `logFailure()`/try-catch pattern
`/api/jobs`'s existing publish-webhook trigger already uses as a
reference implementation. Update `ContentStudio.tsx`'s footer copy to
match whatever the real env var ends up being named.

This is a genuinely small, well-understood implementation once the
external dependency is real — the blocker is information, not
complexity.
