# src/app/api/auth/ — authentication

See [the API pattern](../README.md) for the conventions every route follows.

NextAuth's catch-all handler plus the OTP request endpoint.

`otp/request` is **step 1 of login**: it verifies the password and, if the role requires it, mails a code. It returns the same 401 for unknown address, inactive account and wrong password, so it cannot be used to enumerate accounts.

It must agree with `authorize()` on whether a code is required — both call `otpRequiredFor()`. If they disagreed, login would strand between steps.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- [API overview](../README.md)
