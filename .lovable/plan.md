## What’s wrong
The email template is displaying the auth provider’s actual verification token, and your screenshot shows it is currently **8 digits**. The signup page was hardcoded to ask for **6 digits**, so users receive a valid code that the web form refuses to accept.

## Plan
1. **Update the signup verification form to match the real code length**
   - Change the verification step from 6 slots to 8 slots.
   - Update validation text from “6-digit code” to “8-digit code”.
   - Keep the same code-based verification flow; no magic link.

2. **Update the signup email wording**
   - Change the email copy from “6-digit code” to “8-digit code”.
   - Keep the current WeShare EduTech branded email layout.

3. **Fix the preview/sample data**
   - Update the email preview sample token to 8 digits so future previews match real signup emails.

4. **Verify the auth flow signal**
   - Check that the form now accepts the full code length and still calls the same email verification method.

## Files to change
- `src/routes/signup.tsx`
- `src/lib/email-templates/signup.tsx`
- `src/routes/lovable/email/auth/preview.ts`