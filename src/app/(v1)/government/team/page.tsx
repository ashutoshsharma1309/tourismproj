import type { Metadata } from "next";

import { AddOfficerForm, RemoveOfficerForm } from "@/components/government/ConsoleForms";
import { ConsoleGate } from "@/components/government/ConsoleGate";
import { ConsoleShell } from "@/components/government/ConsoleShell";
import { Badge } from "@/components/ui/Badge";
import { govTeam } from "@/db/queries/government";
import { govAccess, govLanguage } from "@/lib/government/access";
import { canGov } from "@/lib/government/permissions";
import { govTranslator } from "@/lib/i18n/government-messages";

export const metadata: Metadata = { title: "Console team", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Officers of this authority. A reviewer reads the list; a manager changes it. */
export default async function GovernmentTeamPage() {
  const t = govTranslator(await govLanguage());
  const access = await govAccess();
  if (access.kind !== "ok") return <ConsoleGate access={access} t={t} />;
  const manage = canGov(access.role, "manageTeam");
  const members = await govTeam(access.org.id);

  return (
    <ConsoleShell context={access} current="/government/team" t={t} title={t("team.title")} lede={t("team.lede")}>
      {members.length === 0 ? (
        <p className="text-body text-muted">{t("team.empty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4" data-officer={member.email}>
              <div className="min-w-0">
                <p className="truncate text-small font-medium">{member.email}</p>
                <p className="text-caption text-subtle">
                  <Badge tone="neutral">{t(`role.${member.role}`)}</Badge> {member.linked ? "" : t("team.pending")}
                </p>
              </div>
              {manage ? <RemoveOfficerForm memberId={member.id} email={member.email} label={t("team.remove")} /> : null}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        {manage ? (
          <AddOfficerForm
            roles={(["REVIEWER", "MANAGER"] as const).map((role) => ({ value: role, label: t(`role.${role}`) }))}
            labels={{ add: t("team.add"), email: t("team.email"), role: t("team.role"), adding: t("team.adding") }}
          />
        ) : (
          <p className="text-small text-muted">{t("team.readOnly")}</p>
        )}
      </div>
    </ConsoleShell>
  );
}
