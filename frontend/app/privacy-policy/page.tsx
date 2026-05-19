import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { BRAND, CONTACT_US } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BRAND.name} collects, uses, and protects your data, including data accessed via Google APIs.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle={`This Privacy Policy describes how ${BRAND.name} ("we", "us", or "our") collects, uses, stores, and discloses information when you use our website, applications, and services (collectively, the "Service").`}
      lastUpdated="May 19, 2026"
    >
      <h2>1. Introduction</h2>
      <p>
        {BRAND.name} is an AI-powered product review intelligence platform that
        helps product teams analyze customer reviews from the Google Play Store
        and Apple App Store, generate AI-driven summaries and insights, and
        deliver scheduled reports through Gmail and Google Docs. Your privacy is
        critical to us. This policy explains, in plain language, what data we
        collect, why we collect it, and the controls you have over it.
      </p>
      <p>
        By using the Service, you agree to the collection and use of information
        in accordance with this policy. If you do not agree with this policy,
        please do not use the Service.
      </p>

      <h2>2. Information We Collect</h2>

      <h3>2.1 Account Information</h3>
      <p>
        When you sign in to {BRAND.name} using Google OAuth, we receive basic
        profile information from your Google Account, including your name, email
        address, profile picture, and a unique Google account identifier. We use
        this information solely to create and manage your account, authenticate
        you, and personalize your experience.
      </p>

      <h3>2.2 Product and Review Data</h3>
      <p>
        When you connect a Google Play Store or Apple App Store application, we
        collect publicly available metadata about that application (such as the
        app name, package identifier, icon, and category) along with publicly
        available customer reviews. We process this data to generate AI-powered
        summaries, sentiment analysis, theme detection, and leadership-grade
        insights.
      </p>

      <h3>2.3 Google Workspace Data</h3>
      <p>
        With your explicit consent, {BRAND.name} accesses certain Google
        Workspace APIs in order to deliver core product functionality:
      </p>
      <ul>
        <li>
          <strong>Gmail API</strong> — We use the Gmail API only to send report
          emails on your behalf from your connected Google account to recipients
          you specify. We do not read, store, or analyze the contents of your
          inbox.
        </li>
        <li>
          <strong>Google Docs API</strong> — We use the Google Docs API to
          create new documents and append AI-generated reports into Google Docs
          that you have authorized. We only access documents that {BRAND.name}{" "}
          creates or that you explicitly target for report delivery.
        </li>
        <li>
          <strong>Google Drive API (limited scope)</strong> — When required, we
          use the narrowest Drive scope necessary to write the reports we create
          on your behalf. We do not browse, list, or read other files in your
          Drive.
        </li>
      </ul>

      <h3>2.4 Usage and Technical Data</h3>
      <p>
        We automatically collect certain technical information when you use the
        Service, including IP address, browser type and version, device type,
        operating system, referring URLs, pages visited, timestamps, and
        diagnostic data. We use this information to operate, secure, and improve
        the Service.
      </p>

      <h3>2.5 Cookies and Session Data</h3>
      <p>
        We use strictly necessary cookies and secure session tokens to keep you
        signed in, maintain your preferences, and protect against fraudulent
        activity. We do not use third-party advertising cookies or sell
        cookie-derived data. You can control cookies through your browser
        settings, but disabling required cookies may prevent the Service from
        functioning correctly.
      </p>

      <h2>3. Google API Services User Data Policy</h2>
      <p>
        <strong>
          {BRAND.name}'s use and transfer of information received from Google
          APIs to any other app will adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </strong>
      </p>
      <p>
        Specifically, we commit to the following with respect to data accessed
        through Google Workspace APIs (including Gmail, Docs, and Drive scopes):
      </p>
      <ul>
        <li>
          We only request the minimum scopes needed to deliver the features you
          have asked for.
        </li>
        <li>
          We use Google user data only to provide and improve user-facing
          features that are prominent in the application's user interface.
        </li>
        <li>
          We do not transfer Google user data to third parties except as
          necessary to provide or improve user-facing features, comply with
          applicable law, or as part of a merger, acquisition, or sale of assets
          with notice to users.
        </li>
        <li>
          We do not use Google user data for serving advertisements, including
          retargeting, personalized, or interest-based advertising.
        </li>
        <li>
          We do not allow humans to read Google user data unless we have
          obtained your explicit consent to view specific messages or documents,
          it is necessary for security purposes (such as investigating abuse),
          to comply with applicable law, or for internal operations where the
          data has been aggregated and anonymized.
        </li>
      </ul>

      <h2>4. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Authenticate you and provide access to your account.</li>
        <li>
          Fetch, analyze, and summarize app-store reviews you have configured.
        </li>
        <li>
          Generate AI-powered insights and deliver scheduled reports through
          Gmail and Google Docs.
        </li>
        <li>Maintain, secure, monitor, and improve the Service.</li>
        <li>
          Respond to support requests, billing inquiries, and other
          communications.
        </li>
        <li>Comply with legal obligations and enforce our Terms of Service.</li>
      </ul>

      <h2>5. AI Processing</h2>
      <p>
        {BRAND.name} uses third-party large language model providers to generate
        summaries and insights. Review text and report content may be
        transmitted to these providers for the sole purpose of generating the
        requested output. We choose vendors that contractually agree not to
        train their foundation models on customer data. We do not send your
        Google profile information or contents of your Gmail/Docs to AI
        providers as part of normal operation.
      </p>

      <h2>6. Data Sharing and Disclosure</h2>
      <p>
        We do not sell, rent, or trade your personal information. We share
        information only in these limited circumstances:
      </p>
      <ul>
        <li>
          <strong>Service Providers</strong> — Trusted vendors who process data
          on our behalf (cloud hosting, error monitoring, email delivery, AI
          inference) under written contracts that restrict their use of the
          data.
        </li>
        <li>
          <strong>Legal Compliance</strong> — When required to comply with
          applicable law, valid legal process, or to protect the rights,
          property, or safety of {BRAND.name}, our users, or the public.
        </li>
        <li>
          <strong>Business Transfers</strong> — In connection with a merger,
          acquisition, financing, or sale of assets, subject to standard
          confidentiality protections.
        </li>
        <li>
          <strong>With Your Consent</strong> — When you explicitly direct us to
          share information (for example, recipients of reports you send).
        </li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>
        We retain your information for as long as your account is active or as
        needed to provide the Service. OAuth refresh tokens are stored encrypted
        at rest and rotated periodically. Generated reports are retained until
        you delete them or close your account. You may request earlier deletion
        at any time as described in Section 9.
      </p>

      <h2>8. Data Security</h2>
      <p>
        We implement industry-standard administrative, technical, and physical
        safeguards to protect your information, including TLS encryption in
        transit, encryption at rest for sensitive credentials, role-based access
        controls, audit logging, and regular security reviews. No method of
        transmission or storage is 100% secure, but we work continuously to
        protect your data.
      </p>

      <h2>9. Your Rights and Choices</h2>
      <p>You have the right to:</p>
      <ul>
        <li>
          <strong>Access</strong> the personal information we hold about you.
        </li>
        <li>
          <strong>Correct</strong> inaccurate or incomplete data.
        </li>
        <li>
          <strong>Delete</strong> your account and associated data.
        </li>
        <li>
          <strong>Revoke</strong> Google API access at any time via your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Account permissions page
          </a>
          .
        </li>
        <li>
          <strong>Export</strong> your data in a portable, machine-readable
          format.
        </li>
        <li>
          <strong>Object</strong> to certain processing of your data, where
          applicable under your local law.
        </li>
      </ul>

      <h3>9.1 Account Deletion</h3>
      <p>
        You may delete your account at any time from the in-app{" "}
        <strong>Settings → Account</strong> page, or by emailing{" "}
        <a href={`mailto:${CONTACT_US.email.privacy}`}>
          {CONTACT_US.email.privacy}
        </a>{" "}
        from the address associated with your account. Upon deletion, we will
        revoke our access to your Google account, delete or anonymize your
        personal data within thirty (30) days, and remove generated reports
        stored on our infrastructure, except where retention is required by law.
      </p>

      <h2>10. Children's Privacy</h2>
      <p>
        The Service is not directed to children under the age of 13 (or 16 where
        applicable), and we do not knowingly collect personal information from
        children. If you believe a child has provided us with personal
        information, please contact us so we can delete it.
      </p>

      <h2>11. International Data Transfers</h2>
      <p>
        {BRAND.name} is operated from servers located in the United States and
        India. By using the Service, you consent to the transfer of your
        information to jurisdictions that may have different data-protection
        laws than your country of residence. We rely on appropriate safeguards,
        including Standard Contractual Clauses where required.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time to reflect changes
        in our practices or legal requirements. When we make material changes,
        we will notify you by email or through a prominent notice in the
        Service, and we will update the "Last Updated" date above. Continued use
        of the Service after the changes take effect constitutes acceptance of
        the revised policy.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        If you have any questions, concerns, or requests regarding this Privacy
        Policy or our data practices, please contact us at:
      </p>
      <ul>
        <li>
          <strong>Email:</strong>{" "}
          <a href={`mailto:${CONTACT_US.email.contact}`}>
            {CONTACT_US.email.contact}
          </a>
        </li>
        <li>
          <strong>Support:</strong>{" "}
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
