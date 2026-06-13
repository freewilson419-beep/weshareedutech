import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-muted/30 py-12">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Logo className="h-6 w-auto text-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Share what you know. Learn what others share.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">Home</Link></li>
              <li><Link to="/about-platform" className="hover:text-foreground">About this Platform</Link></li>
              <li><Link to="/login" className="hover:text-foreground">Sign In</Link></li>
              <li><Link to="/signup" className="hover:text-foreground">Create account</Link></li>
              <li><a href="/p/learn-to-teach-insight-benefits-and-personal-rewards-c3zio" className="hover:text-foreground">Know more about Learn to Teach</a></li>
              <li><a href="/p/insight-into-reflection-after-learning-personal-and-societal-dcz96" className="hover:text-foreground">Gain Insight into Reflection</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground">Help &amp; FAQ</Link></li>
              <li><a href="mailto:support@weshareeduteach.name.ng" className="hover:text-foreground">Contact us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link></li>
              <li><Link to="/aup" className="hover:text-foreground">Acceptable Use</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          © {year} WeShare EduTech. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
