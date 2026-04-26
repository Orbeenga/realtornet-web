import { AgencyApplyForm } from "@/features/agencies/components";

export default function AgencyApplyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Agency application
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          Apply to join RealtorNet
        </h1>
        <p className="max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
          Tell us about the agency and the owner contact who should represent it.
          Admin approval is required before an agency appears publicly.
        </p>
      </div>

      <AgencyApplyForm />
    </div>
  );
}
