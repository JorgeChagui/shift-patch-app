import { redirect } from "next/navigation";

// proxy.ts sends "/" to the signed-in role's home or to /login before this renders;
// this is only the fallback if the proxy is bypassed.
export default function Home() {
  redirect("/login");
}
