import type { Metadata } from "next";

import { copyFor } from "@/components/partners/workspace/copy";
import { PlanLocked } from "@/components/partners/workspace/PlanLocked";
import { AddMemberForm, RemoveMemberForm } from "@/components/partners/workspace/TeamForms";
import { WorkspaceGate } from "@/components/partners/workspace/WorkspaceGate";
import { WorkspaceShell } from "@/components/partners/workspace/WorkspaceShell";
import { Badge } from "@/components/ui/Badge";
import { teamForPartner } from "@/db/queries/partner-analytics";
import { partnerTranslator } from "@/lib/i18n/partner-messages";
import { partnerAccess, partnerLanguage } from "@/lib/partners/access";
import { allPlans, entitlementsFor } from "@/lib/subscriptions/access";
import { can, lowestPlanWith, withinLimit } from "@/lib/subscriptions/entitlements";

export const metadata: Metadata = { title: "Team", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The partner's team. Existing members are always listed and can always be
 * removed by the owner — a plan that lapses never traps people in a
 * workspace. Adding needs `addTeamMembers` and room under the plan's limit,
 * enforced again in the store.
 */
export default async function PartnerTeamPage() {
  const t = partnerTranslator(await partnerLanguage());
  const access = await partnerAccess("/partner/team");
  if (access.kind !== "ok") return <WorkspaceGate access={access} t={t} next="/partner/team" />;
  const { partner, role } = access;
  const [entitlements, plans, members] = await Promise.all([entitlementsFor(partner.id), allPlans(), teamForPartner(partner.id)]);
  const owner = role === "OWNER";
  const allowed = can(entitlements, "addTeamMembers");
  const room = withinLimit(entitlements, "teamMembers", members.length);
  const copy = copyFor(t, ["team.add", "team.email", "team.adding", "team.remove"]);

  return (
    <WorkspaceShell partner={partner} current="/partner/team" t={t} title={t("team.title")} lede={t("team.lede")}>
      {members.length === 0 ? (
        <p className="text-body text-muted">{t("team.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4" data-member={member.email}>
              <div className="min-w-0">
                <p className="truncate text-small font-medium">{member.email}</p>
                <p className="text-caption text-subtle">
                  <Badge tone="neutral">{t("team.staff")}</Badge> {member.linked ? "" : t("team.pending")}
                </p>
              </div>
              {owner ? <RemoveMemberForm copy={copy} memberId={member.id} email={member.email} /> : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        {!owner ? (
          <p className="text-small text-muted">{t("team.ownerOnly")}</p>
        ) : !allowed ? (
          <PlanLocked message={t("plan.locked", { feature: t("plan.feature.addTeamMembers"), plan: lowestPlanWith(plans, "addTeamMembers")?.name ?? "" })} cta={t("plan.lockedCta")} />
        ) : !room ? (
          <PlanLocked message={t("plan.limitReached", { plan: entitlements.planName })} cta={t("plan.lockedCta")} />
        ) : (
          <AddMemberForm copy={copy} />
        )}
      </div>
    </WorkspaceShell>
  );
}
