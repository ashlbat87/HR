# Entity Relationship Diagram — Review Domain (as of Stage 4 / v0.5)

Focus: the review domain. Reflects the Stage 4 additions (year-end fields, the
ARCHIVED status, and the ARCHIVED timeline event). Per-item scores are authoritative
in ReviewRating; the headline score columns on Review are denormalised convenience.
Performance and values scores are stored in separate named fields and never blended.

```mermaid
erDiagram
    Employee ||--o{ Review : "is subject of"
    Employee ||--o{ Review : "is manager of"
    Employee ||--o{ RoleAssignment : has
    Employee ||--o{ Employee : "manages (managerId)"
    ReviewCycle ||--o{ Review : contains
    Review ||--o{ ReviewRating : has
    Review ||--o{ ReviewEvent : "logs (timeline)"
    RatingGuide ||--o{ RatingGuideVersion : has
    RatingGuideVersion ||--o{ RatingGuideAnchor : has

    Employee {
      string id PK
      string workEmail
      string displayName
      string role
      string dept
      string managerId FK
      string employmentStatus
    }
    ReviewCycle {
      string id PK
      enum type "QUARTERLY | ANNUAL_VALUES | YEAR_END"
      string label
      boolean isOpen
      datetime employeeDeadline
      datetime managerDeadline
    }
    Review {
      string id PK
      enum type "QUARTERLY | ANNUAL_VALUES | YEAR_END"
      enum status "NOT_STARTED | IN_PROGRESS | SUBMITTED | AWAITING_MANAGER | COMPLETE | REOPENED | ARCHIVED"
      string employeeId FK
      string managerId FK
      string cycleId FK
      float quarterlyScore "denormalised (quarterly)"
      float valuesScore "denormalised (values)"
      float annualPerformanceScore "v0.5, numeric only, no label"
      string employeeOverallAssessment "v0.5"
      string managerOverallAssessment "v0.5"
      string areasForGrowth "v0.5"
      string developmentPlan "v0.5"
      datetime acknowledgedAt
      string acknowledgedBy
    }
    ReviewRating {
      string id PK
      string reviewId FK
      enum side "EMPLOYEE | MANAGER"
      string item "authoritative per-item score"
      int score
      string comment
    }
    ReviewEvent {
      string id PK
      string reviewId FK
      enum type "CREATED | DRAFT_SAVED | SUBMITTED | RETURNED | MANAGER_OPENED | MANAGER_COMPLETED | REOPENED | CLOSED | ACKNOWLEDGED | ARCHIVED"
      string actorEmail
      datetime at
      string detail
    }
    RoleAssignment {
      string id PK
      string employeeId FK
      enum role "HR_ADMIN | HR | ..."
    }
```

Notes:
- Stage 4 additions on Review: annualPerformanceScore + four narrative fields; ARCHIVED
  added to status; ARCHIVED added to ReviewEvent type. All additive.
- No rating-label field for the annual score (numeric only; labels are a future
  display-time concern).
- The year-end summary does not introduce a new scoring table; it reads the employee's
  completed quarterly reviews and their values review, and stores the assembled annual
  number as denormalised convenience.
