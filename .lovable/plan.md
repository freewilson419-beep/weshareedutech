## What’s wrong
The signup page and branded email design are set up for **6 digits**, but the authentication service is still issuing an **8 digit** verification token, so users receive a valid code that the web form refuses to accept.

## Plan
1. **Keep the signup verification form at 6 digits**
   - Keep the verification step at 6 slots.
   - Keep validation text as “6-digit code”.
   - Keep the same code-based verification flow; no magic link.

2. **Keep the signup email wording code-length neutral**
   - Show the actual token from the authentication service.
   - Keep the current WeShare EduTech branded email layout.

3. **Fix the preview/sample data**
   - Keep email preview sample tokens at 6 digits.

4. **Verify the auth flow signal**
   - Check that the form accepts 6 digits and still calls the same email verification method.

## Files to change
- `src/routes/signup.tsx`
- `src/lib/email-templates/signup.tsx`
- `src/routes/lovable/email/auth/preview.ts`