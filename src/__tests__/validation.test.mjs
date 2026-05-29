import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstBirthInputError, isLeapYear, daysInMonth } from '../validation.mjs';

test('isLeapYear century rules', () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2024), true);
});

test('daysInMonth leap February', () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2026, 2), 28);
});

test('null for valid input', () => {
  assert.equal(firstBirthInputError({ year: 1995, month: 7, day: 15 }), null);
});

test('rejects out-of-range year, month, day', () => {
  assert.match(firstBirthInputError({ year: 1800, month: 1, day: 1 }), /연도/);
  assert.match(firstBirthInputError({ year: 2000, month: 13, day: 1 }), /월/);
  assert.match(firstBirthInputError({ year: 2026, month: 2, day: 30 }), /2월/);
});
