const assert = require("node:assert/strict");
const { test } = require("node:test");
const { nextOccurrence } = require("../src/controllers/recurringTaskController");

test("daily and weekly recurrences retain their UTC run time", () => {
  const start = new Date("2026-01-01T09:45:00.000Z");
  assert.equal(nextOccurrence({ recurrence_unit: "daily", interval_count: 1 }, start).toISOString(), "2026-01-02T09:45:00.000Z");
  assert.equal(nextOccurrence({ recurrence_unit: "weekly", interval_count: 2 }, start).toISOString(), "2026-01-15T09:45:00.000Z");
});

test("monthly recurrence clamps month days to the final valid calendar day", () => {
  assert.equal(
    nextOccurrence({ recurrence_unit: "monthly", interval_count: 1, month_day: 31 }, "2026-01-31T09:45:00.000Z").toISOString(),
    "2026-02-28T09:45:00.000Z"
  );
});

test("invalid recurrence units, intervals, and monthly days are rejected", () => {
  assert.throws(() => nextOccurrence({ recurrence_unit: "custom", interval_count: 1 }, "2026-01-01T00:00:00.000Z"), /Unsupported recurrence unit/);
  assert.throws(() => nextOccurrence({ recurrence_unit: "daily", interval_count: 0 }, "2026-01-01T00:00:00.000Z"), /Invalid recurrence interval/);
  assert.throws(() => nextOccurrence({ recurrence_unit: "monthly", interval_count: 1, month_day: 32 }, "2026-01-01T00:00:00.000Z"), /Invalid monthly recurrence day/);
});
