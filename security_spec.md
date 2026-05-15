# SihatSapSapSui Security Architecture

## Data Invariants
1. **User Identity Isolation**: A user can only read and write their own profile and health logs.
2. **Sub-resource integrity**: Every health log (Sleep, Meal, Activity) must be strictly linked to the authenticated user's UID.
3. **Immutable Keys**: `userId`, `uid`, and `createdAt` fields cannot be changed after creation.
4. **Temporal Integrity**: `loggedAt`, `completedAt`, and `generatedAt` must use the server timestamp.
5. **Rating Boundaries**: All mood and nutrition ratings must be integers between 1 and 5.
6. **Slot Constraints**: Meal slots must be one of: 'breakfast', 'lunch', 'dinner', 'snack'.
7. **Type Safety**: Hours slept must be a number, duration minutes must be an integer.

## The Dirty Dozen (Malicious Payloads)
1. **Identity Spoofing**: Attempting to create a `User` document with someone else's UID.
2. **Shadow Field Injection**: Adding `isAdmin: true` to a `User` profile.
3. **Cross-User Leak**: Attempting to query `mealLogs` without a `userId` filter.
4. **Rating Poisoning**: Sending `moodRating: 99` in a sleep log.
5. **Future Dating**: Sending a `loggedAt` timestamp in the year 2099.
6. **Orphan Log**: Creating a `SleepLog` for a `userId` that does not exist.
7. **ID Exhaustion**: Sending a 2MB string as a document ID.
8. **Slot Violation**: Setting `mealSlot: 'midnight_feast'`.
9. **Email Hijack**: Attempting to update `email` in the `User` profile (immutable).
10. **Guided Workout Hack**: Attempting to create/modify a `GuidedWorkout` (system-only).
11. **Negative Sleep**: Sending `hoursSlept: -5`.
12. **Nudge Forge**: Attempting to write a custom string to `nutritionNudges` as a user.

## Security Rules Strategy
- **Master Gate**: Access to all logs is derived from the authenticated UID.
- **Validation Blueprints**: Dedicated helper functions for each entity type.
- **Terminal State**: AI insights (Nudges/Weekly) are cached and immutable once generated for a specific date.
