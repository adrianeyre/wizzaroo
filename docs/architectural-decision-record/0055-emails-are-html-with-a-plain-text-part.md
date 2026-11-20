# Emails are HTML with a plain-text part

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

Every email went out as plain text only: one paragraph after another, the link written out, and `Wizzaroo` at the end. It was correct but didn't look like a service a Parent or a Teacher could trust. A password reset, an Invite and a security notice all looked the same, and a link was a long line of characters with nothing to say which part to press. Pen-test I5 also noted that plain text needed no escaping, which an HTML email does.

## Decision

- **Each email is described once, as blocks, and rendered twice.** `src/server/email/email-layout.ts` takes a heading, a greeting and a list of blocks (paragraph, action, details, callout) and renders both an HTML part and a plain-text part from them, so the two can't say different things. Nodemailer sends them as `multipart/alternative`, with the plain text first.
- **One layout, in Wizzaroo's own colours.** A text wordmark, a white card on the default theme's pale blue (`src/client/theme.css`), an optional "Security notice" label, a heading, a details panel for what changed and when, an amber "Wasn't you?" callout, and a footer saying why the address got the email and that replies aren't read. Each link is a button with its address written out under it. Styles are inline and the layout is tables, as email clients need. No images, web fonts or tracking are loaded.
- **Every value is escaped as it is written into the HTML.** Names, addresses and passkey names come from what people typed, so they are only ever text. A name can't become a link, an image or markup. The one-line rule for names (#321) still applies first.
- **Security notices still link to nothing.** The passkey, address-change, password and two-factor notices have no button and no URL in either part.
- **The plain-text part keeps each link on a line of its own**, and every paragraph is one line, so the I5 probes still read it as before.

## Considered options

- **Plain text only, written better:** reads well, but it still can't show which link to press or set a warning apart from what happened.
- **A template engine or MJML:** a new dependency and build step for fifteen emails that share one layout.
- **Images (the pixel logo):** they would load from `PUBLIC_URL`, so many clients block them, and a notice that "links to nothing" would load something. The text wordmark is enough.

## Consequences

- A change to an email's words is made once, in `emails.ts`, and its tests pin the plain-text part exactly and check that the HTML part has the same links.
- The screenshots in `docs/images/emails/` show each email. They have to be taken again when the layout changes.

## Superseded

Superseded by [0069](./0069-emails-are-sent-through-the-email-platform.md): Wizzaroo no longer renders its emails. Each one is a built-in template in the email platform, which holds the HTML and plain-text parts, the layout and the wording, and `email-layout.ts` is deleted.
