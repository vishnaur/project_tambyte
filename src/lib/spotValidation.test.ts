import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateSpotImage,
  validateSpotImageBytes,
  validateSpotSubmission,
} from './spotValidation';

const validSubmission = {
  name: 'Campus Cafe',
  category: 'Food',
  description: 'A place to eat.',
  locationDescription: 'Near the library.',
  hours: '8:00 AM - 5:00 PM',
  budgetRange: 'Php 50 - 100',
  latitude: 14.85,
  longitude: 120.81,
};

test('accepts a valid contribution and coordinates on valid boundaries', () => {
  assert.equal(validateSpotSubmission(validSubmission), null);
  assert.equal(
    validateSpotSubmission({ ...validSubmission, latitude: 0, longitude: 0 }),
    null,
  );
  assert.equal(
    validateSpotSubmission({ ...validSubmission, latitude: -90, longitude: 180 }),
    null,
  );
});

test('rejects invalid categories, missing required values, oversized text, and invalid coordinates', () => {
  assert.notEqual(validateSpotSubmission({ ...validSubmission, category: 'Admin' }), null);
  assert.notEqual(validateSpotSubmission({ ...validSubmission, name: '   ' }), null);
  assert.notEqual(validateSpotSubmission({ ...validSubmission, name: 'x'.repeat(121) }), null);
  assert.notEqual(validateSpotSubmission({ ...validSubmission, description: 'x'.repeat(2001) }), null);
  assert.notEqual(validateSpotSubmission({ ...validSubmission, latitude: Number.NaN }), null);
  assert.notEqual(validateSpotSubmission({ ...validSubmission, longitude: 181 }), null);
});

test('accepts only nonempty JPEG, PNG, or WebP images no larger than 5 MB', () => {
  assert.equal(validateSpotImage({ type: 'image/png', size: 100 }), null);
  assert.notEqual(validateSpotImage({ type: 'image/svg+xml', size: 100 }), null);
  assert.notEqual(validateSpotImage({ type: 'image/jpeg', size: 0 }), null);
  assert.notEqual(validateSpotImage({ type: 'image/webp', size: 5 * 1024 * 1024 + 1 }), null);
});

test('checks image signatures against the declared MIME type', () => {
  assert.equal(
    validateSpotImageBytes('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0x00])),
    null,
  );
  assert.equal(
    validateSpotImageBytes(
      'image/png',
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    null,
  );
  assert.equal(
    validateSpotImageBytes(
      'image/webp',
      new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    ),
    null,
  );
  assert.notEqual(
    validateSpotImageBytes('image/png', new Uint8Array([0xff, 0xd8, 0xff, 0x00])),
    null,
  );
});
