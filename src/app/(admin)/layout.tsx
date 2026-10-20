import { RoleShell } from "@/components/app-shell/role-shell";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return <RoleShell role="admin">{children}</RoleShell>;
}
