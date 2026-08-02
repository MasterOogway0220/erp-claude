# src/app/api/admin/ — administration

See [the API pattern](../README.md) for the conventions every route follows.

User management, password reset, system settings.

Note role enforcement is disabled app-wide, so these endpoints are gated by authentication only. Treat them accordingly.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
