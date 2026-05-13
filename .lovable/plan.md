## Plan

1. **Fix the verification-code email delivery**
   - Keep the current OTP/code signup flow.
   - Re-run the managed email infrastructure setup so the missing queue processor job is created; right now the signup email is stuck as `pending`, so it was generated but never sent.
   - Re-check the email log after setup to confirm new signup emails can move beyond `pending`.
   - Keep the branded signup email as a 6-digit code, not a magic link.

2. **Improve phone layout and prevent horizontal zooming**
   - Update the site viewport meta to prevent user-facing horizontal zoom issues from accidental overflow.
   - Tighten mobile spacing, font sizes, and wrapping on the landing page header/hero/publication feed.
   - Make mobile cards and buttons fit within the viewport without causing sideways scroll.

3. **Make cover images smaller on phones**
   - Reduce the featured feed cover image height/aspect on mobile.
   - Reduce the article detail cover image height on mobile, while keeping desktop images readable.

4. **Fix the logo dot spacing**
   - Move the dot closer to the “WeShare EduTech” text in the SVG logo.
   - Keep the restored blue/white branding and do not redesign the overall UI.

5. **Quick validation**
   - Check the email log/status after the infrastructure fix.
   - Inspect the phone-sized layout for overflow and image sizing.