import assert from "node:assert/strict";
import test from "node:test";
import { isPastDue, parseCustomDateTime, tomorrowMorning } from "./schedule";

test("custom date and time parse in local time with 12-hour edge cases", () => {
  const morning = parseCustomDateTime("10/31/2026", "9:05", "AM");
  assert.ok(morning);
  assert.deepEqual(
    [morning.getFullYear(), morning.getMonth(), morning.getDate(), morning.getHours(), morning.getMinutes()],
    [2026, 9, 31, 9, 5],
  );
  assert.equal(parseCustomDateTime("10/31/2026", "12:00", "AM")?.getHours(), 0);
  assert.equal(parseCustomDateTime("10/31/2026", "12:30", "PM")?.getHours(), 12);
  assert.equal(parseCustomDateTime("10/31/2026", "7:15", "PM")?.getHours(), 19);
  assert.equal(parseCustomDateTime(" 1/5/2027 ", " 8:00 ", "AM")?.getDate(), 5);
});

test("invalid dates and times are rejected instead of rolling over", () => {
  assert.equal(parseCustomDateTime("02/30/2026", "9:00", "AM"), null);
  assert.equal(parseCustomDateTime("13/01/2026", "9:00", "AM"), null);
  assert.equal(parseCustomDateTime("10/31/26", "9:00", "AM"), null);
  assert.equal(parseCustomDateTime("10/31/2026", "13:00", "PM"), null);
  assert.equal(parseCustomDateTime("10/31/2026", "0:30", "AM"), null);
  assert.equal(parseCustomDateTime("10/31/2026", "9:60", "AM"), null);
  assert.equal(parseCustomDateTime("", "", "AM"), null);
  assert.equal(parseCustomDateTime("2026-10-31", "9:00", "AM"), null);
});

test("tomorrow morning is the next calendar day at 10:00 local time", () => {
  const now = new Date(2026, 11, 31, 23, 59);
  const result = tomorrowMorning(now);
  assert.deepEqual(
    [result.getFullYear(), result.getMonth(), result.getDate(), result.getHours(), result.getMinutes()],
    [2027, 0, 1, 10, 0],
  );
});

test("past-due detection only applies to scheduled campaigns whose time has passed", () => {
  const now = Date.parse("2026-10-12T12:00:00.000Z");
  assert.equal(isPastDue({ status: "scheduled", scheduledAt: "2026-10-12T11:59:00.000Z" }, now), true);
  assert.equal(isPastDue({ status: "scheduled", scheduledAt: "2026-10-12T12:01:00.000Z" }, now), false);
  assert.equal(isPastDue({ status: "draft", scheduledAt: "2026-10-12T11:59:00.000Z" }, now), false);
  assert.equal(isPastDue({ status: "scheduled" }, now), false);
});
