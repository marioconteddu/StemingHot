import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const TermsPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-bg-primary text-text-primary overflow-hidden">
      <header className="shrink-0 border-b border-border bg-bg-secondary/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link
            to="/"
            className="rounded-lg p-2 text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Terms and Conditions</h1>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto mx-auto w-full max-w-3xl px-4 py-6 pb-12 space-y-6 text-sm">
        <p className="text-text-muted">Last updated: March 2025</p>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">1. Acceptance of Terms</h2>
          <p className="text-text-secondary leading-relaxed">
            By accessing or using StemingHot ("Software" or "Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, do not use the Software.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">2. Description of Service</h2>
          <p className="text-text-secondary leading-relaxed">
            StemingHot is a local, professional-grade application for music stem separation. It allows you to extract individual stems (e.g. vocals, drums, bass, other instruments) from audio files using AI-based separation models (e.g. HTDemucs). The Software runs on your own machine; audio may be processed locally and is not sent to our servers unless you explicitly use a feature that fetches content from external URLs (e.g. URL download), in which case the request is made from your environment.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">3. User Accounts and Optional Login</h2>
          <p className="text-text-secondary leading-relaxed mb-2">
            Where the Software is configured with optional login (via environment variables), you are responsible for:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li>Maintaining the confidentiality of your credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Notifying the operator of any unauthorized use</li>
          </ul>
          <p className="text-text-secondary leading-relaxed mt-2">
            The operator may suspend or terminate access that violates these Terms. If login is not configured, use of the Software does not create an account relationship.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">4. Acceptable Use</h2>
          <p className="text-text-secondary leading-relaxed mb-2">
            You agree to use StemingHot only for lawful purposes. You must NOT:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-text-secondary">
            <li>Use the Service for any illegal activity</li>
            <li>Upload or process audio that you do not have the right to use or that infringes copyright, trademark, or other intellectual property rights</li>
            <li>Use the Service to infringe on the rights of others</li>
            <li>Attempt to reverse engineer, decompile, or extract the separation models or core logic beyond normal use</li>
            <li>Resell, redistribute, or commercialize access to the Service in a way that violates these Terms or applicable law</li>
            <li>Upload malicious files, malware, or content intended to harm systems</li>
            <li>Use automated systems to abuse the Service (e.g. excessive load) where the Software is shared or networked</li>
          </ul>
          <p className="text-text-secondary leading-relaxed mt-2">
            You are solely responsible for ensuring you have the necessary rights to any audio you process.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">5. Intellectual Property and Content Rights</h2>
          <h3 className="text-sm font-medium text-text-primary mt-3 mb-1">Your Content</h3>
          <p className="text-text-secondary leading-relaxed">
            You retain all rights to the audio files you upload or process and to any stems or outputs you create. By using the Software, you do not grant the operator any ownership of your content. Where processing occurs on your own machine, your files remain under your control and are not transmitted to the operator's servers for storage.
          </p>
          <h3 className="text-sm font-medium text-text-primary mt-3 mb-1">Our Software and Branding</h3>
          <p className="text-text-secondary leading-relaxed">
            The StemingHot application, including its name, branding, user interface, and (where applicable) model packaging and tooling, is owned by the operator and protected by intellectual property laws. You may not copy, modify, or create derivative works of the Software or its branding except as allowed by the license under which you received it.
          </p>
          <h3 className="text-sm font-medium text-text-primary mt-3 mb-1">Copyright Compliance</h3>
          <p className="text-text-secondary leading-relaxed">
            You are solely responsible for ensuring you have the right to process any audio (including via URL download). StemingHot is a tool; how you use the separated stems must comply with applicable copyright and licensing laws.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">6. Payments and Subscriptions</h2>
          <p className="text-text-secondary leading-relaxed">
            StemingHot, as provided in this project, does not currently offer paid subscriptions or in-app payments. If a particular deployment introduces fees, separate terms will apply to those features.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">7. Service Availability and Local Use</h2>
          <p className="text-text-secondary leading-relaxed">
            The Software may be run entirely on your own hardware. The operator does not guarantee availability of any central service, and is not liable for interruptions, maintenance, or unavailability of your own systems. Where you use URL-download or other features that depend on external services (e.g. third-party websites), those services are subject to their own terms and availability.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">8. Disclaimer of Warranties</h2>
          <p className="text-text-secondary leading-relaxed uppercase text-xs">
            The Software is provided "as is" and "as available" without warranties of any kind, express or implied. The operator does not warrant that the Software will be error-free, secure, or meet your specific requirements. AI-based stem separation may not be perfect; results depend on input audio and configuration.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">9. Limitation of Liability</h2>
          <p className="text-text-secondary leading-relaxed uppercase text-xs">
            To the maximum extent permitted by law, the operator and contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, arising from your use of the Software. Total liability shall not exceed the amount (if any) you paid for the Software in the past 12 months, or zero if the Software was obtained at no cost.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">10. Indemnification</h2>
          <p className="text-text-secondary leading-relaxed">
            You agree to indemnify and hold harmless the operator and contributors from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Software, your violation of these Terms, or your infringement of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">11. Termination</h2>
          <p className="text-text-secondary leading-relaxed">
            The operator may suspend or terminate your access to any hosted or shared instance of the Service at any time, with or without cause or notice. Provisions that by their nature should survive (e.g. disclaimers, limitation of liability, indemnification) shall survive. When you run the Software on your own machine, you may stop using it at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">12. Changes to Terms</h2>
          <p className="text-text-secondary leading-relaxed">
            The operator may modify these Terms at any time. Updated Terms will be posted (e.g. in the repository or in-app). Your continued use of the Software after changes constitutes acceptance of the new Terms. For material changes, the "Last updated" date will be revised.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">13. Copyright and DMCA</h2>
          <p className="text-text-secondary leading-relaxed">
            We respect intellectual property rights and expect users to do the same. If you believe that use of the Software or content available through it infringes your copyright, you may send a DMCA takedown notice to the operator. Your notice should include: (1) identification of the copyrighted work, (2) identification of the infringing material and how it is used, (3) your contact information, (4) a statement of good faith belief that use is not authorized, and (5) a statement under penalty of perjury that you are authorized to act on behalf of the copyright owner.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">14. Governing Law and Jurisdiction</h2>
          <p className="text-text-secondary leading-relaxed">
            These Terms shall be governed by the laws of the jurisdiction in which the operator resides or in which the Software is primarily offered, without regard to conflict of law principles. Any disputes shall be resolved in the courts of that jurisdiction, to the extent permitted by law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-text-primary mb-2">15. Contact</h2>
          <p className="text-text-secondary leading-relaxed">
            For questions about these Terms, please open an issue in the project repository or contact the operator through the channel provided where you obtained the Software.
          </p>
        </section>

        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-accent hover:text-accent-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </main>
    </div>
  );
};
