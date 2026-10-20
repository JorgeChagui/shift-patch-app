import { RoleShell } from "@/components/app-shell/role-shell";

export default function NurseLayout({ children }: LayoutProps<"/">) {
  return <RoleShell role="nurse">{children}</RoleShell>;
}
