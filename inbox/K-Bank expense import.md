---
id: idea_expense_import
type: idea
status: promoted
captured: 2026-08-04
source: Claude Code conversation, 2026-08-04
---

# K-Bank expense import for the finance project

Import K-Bank statement CSVs to update financial metrics, since Thai banks have no personal transaction API.

## Notes
- No official API for individuals; download the statement, then parse it
- Assisted import: paste the CSV, AI updates the finance project's metrics
- Avoid automated bank login/scraping (against terms, and fragile)

## Next steps
- Decide the CSV format exported from K PLUS
- Build a parse -> project import helper
