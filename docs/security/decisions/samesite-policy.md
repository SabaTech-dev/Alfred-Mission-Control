# Security Decision Log

## Decision: Cookie SameSite Policy

**Date:** 2026-05-23
**Status:** Approved (lax)
**Reviewer:** Security Agent

### Context
AMC uses JWT tokens stored in `auth_token` cookie for stateless authentication.

### Decision
Using `SameSite="lax"` for the `auth_token` cookie.

### Rationale

**Why "lax" is appropriate for AMC:**
1. **State-changing operations use POST/PUT/DELETE** — CSRF protection is effective
2. **No third-party iframe integrations** —降低了CSRF攻击面
3. **Personal dashboard** — Limited external navigation
4. **UX considerations** — Allows navigation from bookmarks/emails without breaking

**Additional CSRF mitigations in place:**
- `httpOnly`: Prevents XSS token theft
- `secure`: HTTPS-only transmission
- Rate limiting: 5 attempts / 15 min
- JWT expiration: 24 hours
- `path: "/"`: Scoped to application root

**Why not "strict":**
- Would break legitimate workflows (email links, bookmark navigation)
- No additional security benefit for this use case
- Mitigations above provide sufficient protection

### Security Acceptance Criteria
- [x] All state-changing operations use POST/PUT/DELETE
- [x] Rate limiting configured
- [x] JWT with expiration
- [x] httpOnly + secure flags
- [x] No third-party iframe integrations
- [x] Documented in security decision log

### References
- OWASP CSRF Prevention Cheat Sheet
- MDN Web Docs: SameSite cookies
- RFC 6265bis: HTTP State Management Mechanism