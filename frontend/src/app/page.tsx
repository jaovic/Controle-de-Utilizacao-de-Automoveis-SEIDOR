import { redirect } from "next/navigation";

// O proxy já manda quem não está logado para /login.
export default function Home() {
  redirect("/usages");
}
