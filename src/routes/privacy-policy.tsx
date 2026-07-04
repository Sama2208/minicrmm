import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy-policy")({
  ssr: false,
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-6 text-slate-700">
        <h1 className="text-2xl font-semibold text-slate-900">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Last updated: July 2026</p>

        <p>
          This CRM ("the Service") is used by medical clinics to manage leads (prospective patients)
          collected from various sources, including Facebook and Instagram Lead Ads. This policy
          explains what data we collect and how it is used.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">Information We Collect</h2>
        <p>
          When a person submits a lead form through a connected Facebook or Instagram ad, we collect
          the information they provided in that form — typically their full name and phone number —
          along with which form and page the lead came from.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">How We Use Information</h2>
        <p>
          Lead information is used solely to allow the clinic's staff to contact the prospective
          patient and manage the sales/consultation process within the CRM. We do not sell, rent, or
          share this data with any third party outside of the clinic operating the Service.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">Meta Platform Data</h2>
        <p>
          Data received via the Meta Lead Ads integration (Facebook/Instagram) is retrieved using
          the Meta Graph API and stored securely in our database, scoped to the clinic that owns the
          connected Page. Access tokens used to retrieve this data are stored encrypted and are
          never exposed to the client browser.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">Data Retention &amp; Deletion</h2>
        <p>
          Lead data is retained for as long as the clinic's account is active. A clinic
          administrator may delete individual leads at any time from within the Service. To request
          deletion of data associated with your Facebook/Instagram lead submission, contact the
          clinic that placed the ad you responded to.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
        <p>
          For questions about this policy or to request data deletion, contact the platform
          administrator at{" "}
          <a href="mailto:samandarumirzogaliyev03@gmail.com" className="text-emerald-600 underline">
            samandarumirzogaliyev03@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
