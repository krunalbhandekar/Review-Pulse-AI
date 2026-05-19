import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { BRAND, CONTACT_US } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms and conditions that govern your use of ${BRAND.name}.`,
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle={`These Terms of Service ("Terms") govern your access to and use of ${BRAND.name} (the "Service"). By creating an account or using the Service, you agree to be bound by these Terms.`}
      lastUpdated="May 19, 2026"
    >
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using {BRAND.name}, you confirm that you have read,
        understood, and agree to be bound by these Terms and our{" "}
        <a href="/privacy-policy">Privacy Policy</a>. If you are using the
        Service on behalf of an organization, you represent that you have the
        authority to bind that organization to these Terms, and "you" refers to
        that organization.
      </p>
      <p>
        If you do not agree to these Terms, you must not access or use the
        Service.
      </p>

      <h2>2. Description of the Service</h2>
      <p>
        {BRAND.name} is an AI-powered product review intelligence platform that
        helps users:
      </p>
      <ul>
        <li>Sign in securely using Google OAuth.</li>
        <li>
          Add and manage applications from the Google Play Store and Apple App
          Store.
        </li>
        <li>
          Automatically fetch publicly available customer reviews for those
          applications.
        </li>
        <li>
          Generate AI-driven summaries, sentiment analysis, theme detection, and
          actionable insights.
        </li>
        <li>
          Deliver reports via Gmail and append them into Google Docs that you
          have authorized.
        </li>
        <li>Schedule recurring, automated reports at configurable cadences.</li>
      </ul>

      <h2>3. Eligibility and Account Registration</h2>
      <p>
        You must be at least eighteen (18) years old, or the age of majority in
        your jurisdiction, to use the Service. By creating an account, you
        represent that the information you provide is accurate and that you will
        keep it up to date.
      </p>
      <p>
        Authentication is performed exclusively through Google OAuth. You are
        responsible for safeguarding your Google account credentials and for all
        activities that occur under your account. Notify us immediately at{" "}
        <a href={`mailto:${CONTACT_US.email.security}`}>
          {CONTACT_US.email.security}
        </a>{" "}
        if you suspect unauthorized access.
      </p>

      <h2>4. Google Account Authentication and Permissions</h2>
      <p>
        {BRAND.name} uses Google OAuth 2.0 to authenticate users and to access
        specific Google Workspace APIs on your behalf. By granting permissions
        during the OAuth consent flow, you authorize {BRAND.name} to:
      </p>
      <ul>
        <li>
          Verify your identity using your Google profile (name, email, profile
          picture).
        </li>
        <li>
          Send report emails via the Gmail API from your connected Google
          account to recipients you specify.
        </li>
        <li>
          Create and append AI-generated reports into Google Docs that you have
          authorized.
        </li>
        <li>
          Write the report documents we create on your behalf using the minimum
          required Google Drive scope.
        </li>
      </ul>
      <p>
        You may revoke these permissions at any time via your{" "}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Account permissions page
        </a>
        . Doing so may disable some or all features of the Service.
      </p>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to, and not to permit any third party to:</p>
      <ul>
        <li>
          Use the Service to violate any applicable law, regulation, or
          third-party right (including intellectual property rights and privacy
          rights).
        </li>
        <li>
          Reverse engineer, decompile, disassemble, or attempt to derive the
          source code of the Service.
        </li>
        <li>
          Use the Service to send spam, unsolicited messages, or fraudulent
          communications via Gmail or any other channel.
        </li>
        <li>
          Scrape, mine, or extract data from the Service or from any connected
          Google service in violation of those services' terms.
        </li>
        <li>
          Probe, scan, or test the vulnerability of the Service or breach any
          security or authentication measures.
        </li>
        <li>
          Interfere with, disrupt, or impose an unreasonable load on the Service
          or its infrastructure.
        </li>
        <li>
          Use the Service to develop a competing product, or to train
          machine-learning models on data obtained from the Service.
        </li>
        <li>
          Misrepresent your identity, impersonate any person, or falsely imply
          an affiliation with {BRAND.name}.
        </li>
      </ul>

      <h2>6. User Responsibilities</h2>
      <p>You are solely responsible for:</p>
      <ul>
        <li>
          Ensuring you have the right to add the applications you connect and to
          process their associated review data.
        </li>
        <li>
          The accuracy of recipient lists for any reports you send via Gmail.
        </li>
        <li>
          Reviewing AI-generated content before sharing it externally — AI
          output may contain inaccuracies and should not be relied upon without
          human review.
        </li>
        <li>
          Maintaining compliance with the Google Play Store, Apple App Store,
          and Google Workspace terms applicable to your use.
        </li>
        <li>
          The lawful use of any personal data contained in reviews or included
          in reports.
        </li>
      </ul>

      <h2>7. Subscription, Fees, and Billing</h2>
      <p>
        Certain features of the Service may require a paid subscription.
        Pricing, billing cycles, and feature tiers are described on our pricing
        page or order form. Fees are charged in advance and are non-refundable
        except where required by law. Failure to pay fees when due may result in
        suspension or termination of your account.
      </p>
      <p>
        We may change pricing at any time, with at least thirty (30) days' prior
        notice for active subscribers. Continued use of paid features after the
        change takes effect constitutes acceptance of the new pricing.
      </p>

      <h2>8. Intellectual Property</h2>
      <h3>8.1 Our Property</h3>
      <p>
        {BRAND.name}, including all related software, designs, text, graphics,
        logos, and trademarks, is owned by us or our licensors and is protected
        by intellectual property laws. These Terms grant you a limited,
        non-exclusive, non-transferable, revocable license to use the Service
        for its intended purpose.
      </p>

      <h3>8.2 Your Content</h3>
      <p>
        You retain all rights to the data, configurations, and content you
        provide to the Service ("Your Content"). You grant us a worldwide,
        non-exclusive, royalty-free license to host, store, transmit, display,
        and process Your Content solely to provide and improve the Service for
        you.
      </p>

      <h3>8.3 Feedback</h3>
      <p>
        If you provide feedback, ideas, or suggestions about the Service, you
        grant us a perpetual, irrevocable, royalty-free license to use that
        feedback without restriction or obligation to you.
      </p>

      <h2>9. Third-Party Services</h2>
      <p>
        The Service integrates with third-party services including Google
        Workspace (Gmail, Docs, Drive), the Google Play Store, and the Apple App
        Store. Your use of those services is governed by their respective terms
        of service and privacy policies. We are not responsible for the
        availability, accuracy, or content of any third-party service.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES
        OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
        IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
        NON-INFRINGEMENT, OR ACCURACY. WE DO NOT WARRANT THAT THE SERVICE WILL
        BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM HARMFUL COMPONENTS,
        OR THAT AI-GENERATED OUTPUTS WILL BE ACCURATE, COMPLETE, OR SUITABLE FOR
        YOUR PURPOSES.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL{" "}
        {BRAND.name.toUpperCase()}, ITS AFFILIATES, OFFICERS, EMPLOYEES, AGENTS,
        OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUES,
        DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR
        RELATED TO YOUR USE OF, OR INABILITY TO USE, THE SERVICE.
      </p>
      <p>
        OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING
        TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE
        AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE
        EVENT GIVING RISE TO THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS
        (US$100).
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless {BRAND.name} and its
        affiliates from and against any claims, liabilities, damages, losses,
        and expenses (including reasonable attorneys' fees) arising out of or
        related to: (a) your use or misuse of the Service; (b) your violation of
        these Terms; (c) your violation of any third-party right, including any
        intellectual property or privacy right; or (d) Your Content.
      </p>

      <h2>13. Suspension and Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time via
        the in-app <strong>Settings → Account</strong> page or by contacting{" "}
        <a href={`mailto:${CONTACT_US.email.support}`}>
          {CONTACT_US.email.support}
        </a>
        .
      </p>
      <p>
        We may suspend or terminate your access to the Service immediately,
        without prior notice, if you breach these Terms, if your account poses a
        security risk, or as required by law. Upon termination, your right to
        use the Service ceases, and we will revoke our Google API access and
        delete or anonymize your personal data in accordance with our{" "}
        <a href="/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>14. Modifications to the Service or Terms</h2>
      <p>
        We may modify, suspend, or discontinue any part of the Service at any
        time. We may also revise these Terms from time to time. When we make
        material changes, we will notify you by email or through the Service and
        update the "Last Updated" date above. Your continued use of the Service
        after changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h2>15. Governing Law and Dispute Resolution</h2>
      <p>
        These Terms are governed by and construed in accordance with the laws of
        India, without regard to its conflict-of-law principles. Any dispute
        arising out of or relating to these Terms or the Service shall be
        subject to the exclusive jurisdiction of the courts located in
        Bengaluru, Karnataka, India, unless required otherwise by applicable
        law.
      </p>

      <h2>16. Miscellaneous</h2>
      <ul>
        <li>
          <strong>Entire Agreement.</strong> These Terms, together with the
          Privacy Policy, constitute the entire agreement between you and{" "}
          {BRAND.name} regarding the Service.
        </li>
        <li>
          <strong>Severability.</strong> If any provision is held unenforceable,
          the remaining provisions remain in full effect.
        </li>
        <li>
          <strong>No Waiver.</strong> Our failure to enforce any right or
          provision is not a waiver of that right or provision.
        </li>
        <li>
          <strong>Assignment.</strong> You may not assign these Terms without
          our prior written consent. We may assign these Terms freely.
        </li>
        <li>
          <strong>Force Majeure.</strong> We are not liable for any failure or
          delay caused by events beyond our reasonable control.
        </li>
      </ul>

      <h2>17. Contact Us</h2>
      <p>For any questions about these Terms, please contact:</p>
      <ul>
        <li>
          <strong>General:</strong>{" "}
          <a href={`mailto:${CONTACT_US.email.support}`}>
            {CONTACT_US.email.support}
          </a>
        </li>
        <li>
          <strong>Legal & Security:</strong>{" "}
          <a href={`mailto:${CONTACT_US.email.support}`}>
            {CONTACT_US.email.support}
          </a>
        </li>
        <li>
          <strong>Mailing Address:</strong> {CONTACT_US.address}
        </li>
      </ul>
    </LegalLayout>
  );
}
