# Ticket 155-branding-uploads

Status: done
Labels: bugfix, ux, media

Branding uploads "look broken": (1) >2MB files 422 silently, (2) picker
swallows the error, (3) tab preview goes stale after save+redirect.

- [x] Client downscale (format-preserving, 1920px) before upload + visible errors.
- [x] BrandingFields sync on saved values.
- [x] Live: oversize PNG upload → stored → pref → preview + header logo.
- [x] Chain green + release.
