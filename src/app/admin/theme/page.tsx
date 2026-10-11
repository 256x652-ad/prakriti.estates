import { redirect } from "next/navigation";

export default function AdminThemeRedirect() {
  redirect("/admin/settings/theme");
}
