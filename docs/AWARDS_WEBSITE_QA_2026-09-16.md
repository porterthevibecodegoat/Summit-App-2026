# Awards website design and verification

Scope: owner-approved 2026 Awards presentation and the coordinated original-site
restoration. No native app, admin permissions, canonical event records, or Airtable
records were modified by this visual pass.

## Content boundaries

- Current dates, program and 53 confirmed guests come from the reviewed published
  2026 snapshot. Summit attendance does not imply an Awards performance or honor.
- Original chair and production credits remain the owner's approved exception.
- Missing portraits use initials, never generated or guessed photographs.
- Four current portraits were retrieved read-only from Airtable attachments.
- The hero uses the existing Wynn Las Vegas venue photograph. The video poster
  remains the explicitly labeled 2025 Awards image, avoiding a repeated hero shot.
  Source: https://www.youtube.com/watch?v=z2NdP-X7_Mc (official Not Alone Challenge).
  Image: https://i.ytimg.com/vi/z2NdP-X7_Mc/maxresdefault.jpg.
- The separate 2025 archive retains its source names, portraits and full copy.

## Verification

- Repository lint and typecheck passed.
- Repository tests: 153 passed, including 24 website tests.
- Website production build passed; all routes compiled.
- Browser layout matrix: 320x568, 375x667, 390x844, 430x932, 768x1024,
  1024x768, 1440x1000 and 1920x1080. No horizontal document overflow.
- Visual inspection of compact phone, standard phone, tablet and desktop layouts.
- Guest search, empty results, profile links and Awards-specific return navigation
  verified. The directory displayed 53 guests with no observed broken images.
- Highlights poster, Play, Close and external YouTube fallback verified.
- Hero-image follow-up: distinct hero/video regression test passed, with repository
  lint, typecheck and all 153 tests rerun successfully. Venue-image crops checked at
  1440x1000, 1280x720, 390x844 and 320x668 with no horizontal overflow.

## Limitations

The in-app browser did not render the cross-origin YouTube embed contents.
Embedded playback is therefore not claimed as verified. The official watch page
played successfully; its always-visible link remains available, and the poster is
retained behind an empty iframe. This is browser-based website QA, not native iOS
or every physical device certification. Unconfirmed Awards roles remain pending.
