-- ============ LEGAL DOCUMENTS ============
CREATE TABLE public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_read_public" ON public.legal_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "legal_admin_all" ON public.legal_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_legal_updated BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_documents (slug, title, body) VALUES
('terms', 'Terms of Service', E'# Terms of Service\n\n_Last updated: edit me from /admin/legal_\n\nWelcome to **WeShare EduTech**. By using this platform you agree to these terms.\n\n## 1. Who we are\nWeShare EduTech is a community learning publication operated from Nigeria.\n\n## 2. Accounts\nYou must provide accurate information when creating an account and keep your credentials secure.\n\n## 3. User content\nYou retain ownership of lessons you publish, but you grant us a worldwide, royalty-free licence to display them on the platform.\n\n## 4. Acceptable use\nYou agree to follow our Acceptable Use Policy. Violations may result in content removal or account suspension.\n\n## 5. Termination\nWe may suspend or terminate accounts that violate these terms.\n\n## 6. Disclaimer\nThe platform is provided "as is" without warranty.\n\n## 7. Governing law\nThese terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved in the courts of Lagos State.\n\n## 8. Contact\nQuestions? Email **support@weshareeduteach.name.ng**.'),

('privacy', 'Privacy Policy', E'# Privacy Policy\n\n_Last updated: edit me from /admin/legal_\n\nThis Privacy Policy explains how **WeShare EduTech** collects, uses, and protects your personal data, in line with the Nigeria Data Protection Regulation (NDPR) and applicable international laws.\n\n## What we collect\n- **Account data**: name, email, phone, university, department.\n- **Content data**: lessons, comments, claps, bookmarks.\n- **Usage data**: page views, device info, IP address.\n\n## How we use it\n- To provide and improve the service\n- To send notifications you opted into\n- To enforce our Terms and Acceptable Use Policy\n\n## Sharing\nWe do not sell your data. We share with service providers (hosting, email delivery) under strict confidentiality.\n\n## Your rights (NDPR & GDPR)\nYou may request access, correction, deletion, or export of your data by emailing **privacy@weshareeduteach.name.ng**.\n\n## Retention\nWe keep your data for as long as your account is active. Deleted accounts are removed within 30 days.\n\n## Security\nWe use industry-standard encryption in transit and at rest.\n\n## Children\nThe platform is not intended for children under 13.\n\n## Contact / Data Protection Officer\n**privacy@weshareeduteach.name.ng**'),

('cookies', 'Cookie Policy', E'# Cookie Policy\n\n_Last updated: edit me from /admin/legal_\n\nWe use cookies and similar technologies to operate **WeShare EduTech**.\n\n## Types of cookies\n- **Essential**: keep you signed in, remember preferences.\n- **Analytics**: anonymous usage statistics so we can improve the platform.\n- **Functional**: remember your cookie consent choice.\n\n## Managing cookies\nMost browsers let you block or delete cookies. Disabling essential cookies may break sign-in.\n\n## Changes\nWe will update this page if our cookie use changes.\n\n## Contact\n**support@weshareeduteach.name.ng**'),

('aup', 'Acceptable Use Policy', E'# Acceptable Use Policy\n\n_Last updated: edit me from /admin/legal_\n\nTo keep **WeShare EduTech** safe and useful for everyone, you agree NOT to:\n\n- Post content that is illegal, defamatory, obscene, or hateful.\n- Infringe anyone''s copyright or intellectual property.\n- Share misinformation, spam, or manipulated content.\n- Harass, threaten, or impersonate other users.\n- Distribute malware or attempt to compromise the platform.\n- Use automated tools to scrape or overload the service.\n\n## Reporting\nUse the **Report** button on any lesson to flag content. Our moderation team will review.\n\n## Enforcement\nViolations may result in content removal, warnings, suspension, or permanent ban.\n\n## Contact\n**support@weshareeduteach.name.ng**');

-- ============ CONTENT REPORTS ============
CREATE TYPE report_reason AS ENUM ('spam', 'inappropriate', 'copyright', 'misinformation', 'harassment', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed', 'removed');

CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  reporter_user_id uuid NOT NULL,
  reason report_reason NOT NULL,
  details text NOT NULL DEFAULT '',
  status report_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_user_id uuid,
  UNIQUE (post_id, reporter_user_id)
);

CREATE INDEX idx_reports_status ON public.content_reports (status, created_at DESC);
CREATE INDEX idx_reports_post ON public.content_reports (post_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_self" ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());
CREATE POLICY "reports_read_own_or_admin" ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "reports_admin_update" ON public.content_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "reports_admin_delete" ON public.content_reports FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ FAQ ITEMS ============
CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'General',
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_faq_published ON public.faq_items (is_published, category, sort_order);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faq_read_public" ON public.faq_items FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "faq_admin_all" ON public.faq_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_faq_updated BEFORE UPDATE ON public.faq_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.faq_items (category, question, answer, sort_order) VALUES
('Getting Started', 'What is WeShare EduTech?', 'WeShare EduTech is a community publication where participants publish structured lessons that anyone can read for free. Sign in to publish, comment, clap, and bookmark.', 1),
('Getting Started', 'Is it free to use?', 'Yes — reading is completely free, and creating an account to publish is also free.', 2),
('Getting Started', 'Do I need an account to read lessons?', 'No. All published lessons are open to everyone. You only need an account to publish, comment, clap, or bookmark.', 3),
('Writing Lessons', 'How do I publish a lesson?', 'Sign in, click **Write** in the top navigation, fill in the structured fields (Goal, Introduction, Body, Conclusion, Reflection, Learn-to-teach), and hit Publish.', 1),
('Writing Lessons', 'Can I publish anonymously?', 'Yes. When composing a lesson, toggle "Publish anonymously". Your name will appear as "Anonymous" on the public page.', 2),
('Writing Lessons', 'Can I add images and videos to my lesson?', 'Yes. Each section supports images and embedded videos via the media manager.', 3),
('Writing Lessons', 'Can I edit a lesson after publishing?', 'Yes. Go to **My Lessons** in your dashboard and open the lesson to edit it.', 4),
('Account & Profile', 'How do I change my email or password?', 'Go to **Settings → Account** to update your email or password.', 1),
('Account & Profile', 'How do I delete my account?', 'Email **support@weshareeduteach.name.ng** with the subject "Delete my account" and we will remove your data within 30 days.', 2),
('Notifications & Email', 'How do announcements work?', 'When the team posts an announcement, you receive both an in-app notification and an email. In-app notifications clear automatically once you open the bell.', 1),
('Notifications & Email', 'How do I unsubscribe from emails?', 'Click the **Unsubscribe** link at the bottom of any email we send.', 2),
('Troubleshooting', 'I did not receive my verification email.', 'Check your spam folder. If it is not there after 5 minutes, try signing up again or contact support.', 1),
('Troubleshooting', 'A lesson looks broken or has bad content.', 'Use the **Report** button on the lesson page. Our moderation team will review it.', 2),
('Contact', 'How do I contact support?', 'Email **support@weshareeduteach.name.ng**.', 1),
('Contact', 'How do I report a bug?', 'Email **support@weshareeduteach.name.ng** with the subject "Bug report" and include screenshots if possible.', 2);