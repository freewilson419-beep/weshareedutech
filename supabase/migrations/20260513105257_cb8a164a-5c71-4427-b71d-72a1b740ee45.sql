
-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('student', 'lecturer', 'admin');
CREATE TYPE public.post_visibility AS ENUM ('private', 'public');

-- ============ updated_at helper ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  surname text NOT NULL DEFAULT '',
  othernames text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  phone_number text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  affiliation text NOT NULL DEFAULT '',
  control_number text NOT NULL DEFAULT '',
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ Auto-create profile + default role on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UNIVERSITIES ============
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_code text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

-- ============ COURSES ============
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  school text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER courses_updated BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX courses_owner_idx ON public.courses(owner_user_id);

-- ============ ENROLLMENTS ============
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX enrollments_user_idx ON public.enrollments(user_id);

-- helper: is enrolled
CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = _user_id AND course_id = _course_id)
$$;

-- helper: is course owner
CREATE OR REPLACE FUNCTION public.is_course_owner(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = _course_id AND owner_user_id = _user_id)
$$;

-- ============ COURSE INVITES ============
CREATE TABLE public.course_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_invites ENABLE ROW LEVEL SECURITY;

-- ============ POSTS ============
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  goal text NOT NULL DEFAULT '',
  visibility post_visibility NOT NULL DEFAULT 'private',
  intro_slide text NOT NULL DEFAULT '',
  body_slide text NOT NULL DEFAULT '',
  conclusion_slide text NOT NULL DEFAULT '',
  reflection text NOT NULL DEFAULT '',
  learn_to_teach text NOT NULL DEFAULT '',
  invited_emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX posts_course_idx ON public.posts(course_id);

-- helper: can_view_post
CREATE OR REPLACE FUNCTION public.can_view_post(_user_id uuid, _post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
    AND (
      p.author_user_id = _user_id
      OR p.visibility = 'public'
      OR public.is_course_owner(_user_id, p.course_id)
      OR public.is_enrolled(_user_id, p.course_id)
    )
  )
$$;

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  notify_students boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX comments_post_idx ON public.comments(post_id);

-- ============ SUBMISSIONS ============
CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_kind text NOT NULL,
  media_path text NOT NULL,
  transcript text NOT NULL DEFAULT '',
  score double precision,
  ai_feedback text NOT NULL DEFAULT '',
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  retake_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER submissions_updated BEFORE UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX submissions_post_idx ON public.submissions(post_id);
CREATE INDEX submissions_student_idx ON public.submissions(student_user_id);

-- ============ QUIZZES ============
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER quizzes_updated BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ QUIZ ATTEMPTS ============
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  type_answer_score double precision,
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback text NOT NULL DEFAULT '',
  is_graded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX quiz_attempts_post_idx ON public.quiz_attempts(post_id);
CREATE INDEX quiz_attempts_user_idx ON public.quiz_attempts(user_id);

-- ============ PUSH SUBSCRIPTIONS ============
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX notifications_user_idx ON public.notifications(user_id, is_read);

-- ============ PLATFORM ANNOUNCEMENTS ============
CREATE TABLE public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

-- ============ SETTINGS ============
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- ============================ POLICIES ===============================
-- =====================================================================

-- profiles: anyone authenticated reads; user updates own; insert handled by trigger
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- user_roles: user reads own; admin manages
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- universities: read by all auth; admin writes
CREATE POLICY "universities_read" ON public.universities FOR SELECT TO authenticated USING (true);
CREATE POLICY "universities_admin" ON public.universities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- courses: visible to owner + enrolled + admins (and any authenticated for discovery — keep open for catalog browsing)
CREATE POLICY "courses_read" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_insert_own" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "courses_update_own" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "courses_delete_own" ON public.courses FOR DELETE TO authenticated USING (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));

-- enrollments: user reads own + course owner reads all; user inserts own; owner can delete
CREATE POLICY "enrollments_read" ON public.enrollments FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.is_course_owner(auth.uid(), course_id) OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "enrollments_insert_self" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "enrollments_delete" ON public.enrollments FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.is_course_owner(auth.uid(), course_id) OR public.has_role(auth.uid(),'admin')
);

-- course_invites: only course owner manages
CREATE POLICY "invites_owner_all" ON public.course_invites FOR ALL TO authenticated
  USING (public.is_course_owner(auth.uid(), course_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.is_course_owner(auth.uid(), course_id) OR public.has_role(auth.uid(),'admin'));

-- posts: read if can_view; owner writes
CREATE POLICY "posts_read_visible" ON public.posts FOR SELECT TO authenticated USING (
  author_user_id = auth.uid()
  OR visibility = 'public'
  OR public.is_course_owner(auth.uid(), course_id)
  OR public.is_enrolled(auth.uid(), course_id)
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "posts_insert_owner" ON public.posts FOR INSERT TO authenticated WITH CHECK (
  public.is_course_owner(auth.uid(), course_id) AND author_user_id = auth.uid()
);
CREATE POLICY "posts_update_owner" ON public.posts FOR UPDATE TO authenticated USING (
  author_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "posts_delete_owner" ON public.posts FOR DELETE TO authenticated USING (
  author_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
);

-- announcements
CREATE POLICY "ann_read_post" ON public.announcements FOR SELECT TO authenticated USING (public.can_view_post(auth.uid(), post_id));
CREATE POLICY "ann_owner_write" ON public.announcements FOR ALL TO authenticated
  USING (author_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (author_user_id = auth.uid());

-- comments
CREATE POLICY "comments_read_post" ON public.comments FOR SELECT TO authenticated USING (public.can_view_post(auth.uid(), post_id));
CREATE POLICY "comments_insert_self" ON public.comments FOR INSERT TO authenticated WITH CHECK (
  author_user_id = auth.uid() AND public.can_view_post(auth.uid(), post_id)
);
CREATE POLICY "comments_delete_self" ON public.comments FOR DELETE TO authenticated USING (
  author_user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
);

-- submissions: student sees own; course owner sees all in their courses' posts
CREATE POLICY "submissions_read" ON public.submissions FOR SELECT TO authenticated USING (
  student_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.is_course_owner(auth.uid(), p.course_id))
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "submissions_insert_self" ON public.submissions FOR INSERT TO authenticated WITH CHECK (
  student_user_id = auth.uid() AND public.can_view_post(auth.uid(), post_id)
);
CREATE POLICY "submissions_update" ON public.submissions FOR UPDATE TO authenticated USING (
  student_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.is_course_owner(auth.uid(), p.course_id))
  OR public.has_role(auth.uid(),'admin')
);

-- quizzes
CREATE POLICY "quizzes_read" ON public.quizzes FOR SELECT TO authenticated USING (public.can_view_post(auth.uid(), post_id));
CREATE POLICY "quizzes_owner_write" ON public.quizzes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_user_id = auth.uid()));

-- quiz_attempts
CREATE POLICY "attempts_read" ON public.quiz_attempts FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "attempts_insert_self" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "attempts_update" ON public.quiz_attempts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);

-- push subscriptions
CREATE POLICY "push_own" ON public.push_subscriptions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- notifications
CREATE POLICY "notif_read_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- platform announcements: read by all; admin writes
CREATE POLICY "platann_read" ON public.platform_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "platann_admin" ON public.platform_announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- settings: admin only
CREATE POLICY "settings_admin" ON public.settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =====================================================================
-- =========================== STORAGE =================================
-- =====================================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: <user_id>/<post_id>/<filename>
CREATE POLICY "submissions_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "submissions_read_own_or_owner" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.posts p
        WHERE p.id::text = (storage.foldername(name))[2]
        AND public.is_course_owner(auth.uid(), p.course_id)
      )
      OR public.has_role(auth.uid(),'admin')
    )
  );

CREATE POLICY "submissions_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
