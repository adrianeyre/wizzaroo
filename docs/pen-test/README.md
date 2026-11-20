# Pen-test findings workflow

> **Personal use only.** Wizzaroo is intended for your own personal use only. It is not intended for use with or by a school, teacher, parent or student. Only use it for yourself.

How a finding from a pen-test round is filed, triaged, waived, fixed and verified. The brief, the severities and the remediation targets are in [the pen-testing PRD](../product-requirements-document/pen-testing.md), and this page restates none of them. The findings notes beside this page (`findings/<ID>.md`) name exploit chains, so they are kept private on the same terms as the PRD.

## Filing a finding

Every confirmed weakness is its own issue, filed with the **Pen-test finding** template (`.github/ISSUE_TEMPLATE/pen-test-finding.yml`) within one working day of being found. The template adds `prd:pen-test`; the filer adds exactly one severity label:

| Label               | Colour    |
| ------------------- | --------- |
| `severity:critical` | `#7f1d1d` |
| `severity:high`     | `#b91c1c` |
| `severity:medium`   | `#ef4444` |
| `severity:low`      | `#fca5a5` |

Which one applies is decided by the table under [Findings workflow](../product-requirements-document/pen-testing.md#findings-workflow). A finding filed without the new-issue page, by `gh issue create` or by an agent, uses the template's headings in its order, so every finding has one shape:

```markdown
### Scope issue

### H entry

### Rule broken

### Steps to reproduce

### Observed

### Expected

### Impact

### Test that would have caught it
```

## Triage, the same working day

Triage happens on the working day the finding is filed, and the remediation clock starts when it ends. For each new finding:

1. **Reproduce it** on the pen-test deployment from its steps alone. A finding that won't reproduce goes back to its filer with what happened instead, and the clock doesn't start.
2. **Confirm the severity** against [the targets](../product-requirements-document/pen-testing.md#findings-workflow). Swap the label if it is wrong, so the issue keeps exactly one, and say why in a comment.
3. **Check the shape:** the scope issue and H entry are named, the rule broken cites a section of `wizzaroo.md` and an ADR, and the test that would have caught it is named.
4. **Link it back:** the scope issue's findings note in `findings/` and the H entry in the PRD name the finding's issue.
5. **Write the confirmation** as a comment: "Triaged on _date_; target _date_", the target counted in working days from the table.
6. **Add `owner`** if what happens next waits on the owner's decision.

A critical finding is told to the owner as soon as it is triaged. How it is reported in the first round and in the external round is under [Findings workflow](../product-requirements-document/pen-testing.md#findings-workflow).

## Remediation targets

The working days each severity has, from triage, are the table under [Findings workflow](../product-requirements-document/pen-testing.md#findings-workflow). That table is their only home.

## `wontfix`

`wontfix` goes on only after the owner has written the rationale in the issue: what is accepted, why, and the date it stops being true. A `wontfix` label with no rationale above it is taken off until one is written. A waiver is the "waived in writing" that the second-School gate counts.

## Fixed is not verified

A finding moves through two states after triage, and only the second ends it.

- **Fixed, unverified:** the fix's pull request says `Fixes #<n>`, written plainly, and turns the probe's `today_…` test into its `(regression)` test, never deleting it. Merging closes the issue.
- **Verified:** the probe that found it has been run again against the pen-test deployment, with the fix in, and passes. The run is posted on the issue (the commit, the test and its output), and the H entry in the PRD records the verdict and the date.

A probe that fails on re-run reopens the issue, and the clock carries on from the original triage. A finding answered by an ADR rather than code stays open until the code matches it, unless the ADR accepts the finding.

## Readiness

The round's window opens once every enablement issue is ready. Each row is amended by the issue it names.

| Issue | Delivers                                                                       | Where                                                                                                       | Ready |
| ----- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ----- |
| E1    | The pen-test deployment: its own Compose project, volume and `.env`, torn down | `docs/pen-test/deployment.md`, `docker-compose.pen-test.yml`                                                | Yes   |
| E2    | Fixtures: the synthetic Schools, Families and staff, with their seed           | `docs/pen-test/fixtures.md`, `src/server/pen-test-fixtures/`                                                | Yes   |
| E3    | Rules of engagement and statement of work                                      | `docs/pen-test/rules-of-engagement.md`, `docs/pen-test/statement-of-work.md` (signed when the round closes) | Yes   |
| E4    | The credentials package, and how its secrets are delivered                     | `docs/pen-test/credentials-package.md`                                                                      | Yes   |
| E5    | The findings workflow: severity labels, finding template and this page         | `.github/ISSUE_TEMPLATE/pen-test-finding.yml`, `docs/pen-test/README.md`                                    | Yes   |
