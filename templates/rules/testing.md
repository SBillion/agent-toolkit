# Testing

## Three kinds, three folders

| Kind | What it proves | What it may touch |
|---|---|---|
| `unit` | one function or module behaves | nothing external — no network, no database, no clock |
| `integration` | the wiring between components holds | real components, external boundaries **mocked** |
| `functional` | the product works through its real entry point | the real entry point, end to end |

A test that needs a database is not a unit test. A test that mocks the parser is
not functional. Put each in its own folder (`tests/unit`, `tests/integration`,
`tests/functional` or the project's equivalent) and tag it so `-m` selection works.

## The folders mirror the code

Inside each kind, keep the same tree as the production code: one folder per
bounded context or package (`tests/unit/billing/`, `tests/integration/server/`).
A test lives next to the unit it names, not in a flat pile. A file that outgrows
one screen is split by **concern**, not by size: auth, listing, actions,
failures. Shared fakes, stubs and builders move to a kit file (`fakes.py`,
`helpers.py`, `runsTestKit.ts`) that the split files import — never copy a helper
into each file.

An end-to-end suite (browser or API against a deployed environment) lives in its
own repository and mirrors the product's journeys (`search/`, `account/`,
`accessibility/`), because "unit/integration/functional" describe code in the
repo, not a deployed system.

## Frontend

Component and hook tests sit next to the component (`X.test.tsx`). Split a large
one by concern (`Sites.list.test.tsx`, `Sites.actions.test.tsx`,
`Sites.runs.test.tsx`) with a `sitesTestKit.tsx` holding the render helper and
fixtures. Use `it.each` / `test.each` for tables of inputs; do not repeat the
same `expect` five times. No real network: stub `fetch` and the browser APIs at
the boundary. Test what the user sees (roles, labels, text), not internal state.

## Gates

- **CI runs all three**, with a coverage floor on the aggregate, not per file.
  A kind nobody runs is a kind that rots.
- **Every commit leaves CI green.** A red gate is fixed before the next task, not
  carried.
- Tests never call a real API, a real mailbox or a paid provider. Boundaries are
  mocks or fakes; the one suite allowed to hit a real service runs against a
  dedicated test installation, never production.

## Writing them

- **New behaviour ships with its test**; a bug fix ships the test that would have
  caught it. A new branch (a condition, a parser, money, security) without a test
  is an unfinished change.
- **Parametrise multi-case tests**, with readable ids — never copy-paste the same
  test function.
- **AAA**: arrange, act, assert, in that order, visibly.
- Name the test after the unit and the scenario: `test_<unit>_<scenario>`.
- **Assert the contract, not the implementation**: what the caller can observe.
  A test that only checks the happy path lets the wrong model through.
- Fixtures are shared from one place; a test owns its data and leaves nothing
  behind.

## What a test is not

- Not a substitute for the verification gate, and a green verification is not a
  green build.
- Not a place to disable a rule to make a check pass. An inline suppression names
  its rule and says why.
