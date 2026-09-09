"use client";

import { useRouter } from "next/navigation";

// Ecran afisat DOAR contului "super_admin" (singurul care vede ambele
// sectiuni), imediat dupa login, inainte sa aleaga in ce sectiune intra.
// Alegerea se face prin query param (?section=camin / ?section=vega), citit
// server-side in app/dashboard/page.js - simplu, functioneaza cu butonul
// "inapoi" al browserului si poate fi pus la favorite.
export default function SectionChooser({ user }) {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div id="login-screen">
      <div className="login-box" style={{ maxWidth: 420, gap: 14 }}>
        <h1>Bună, {user.full_name}</h1>
        <p className="subtitle">
          Contul tău are acces la ambele secțiuni. Alege în care vrei să intri — poți oricând să treci în
          cealaltă din meniul de sus.
        </p>

        <button
          type="button"
          className="section-choice-btn section-choice-btn-camin"
          onClick={() => router.push("/dashboard?section=camin")}
        >
          Cămin Romantic
        </button>
        <button
          type="button"
          className="section-choice-btn section-choice-btn-vega"
          onClick={() => router.push("/dashboard?section=vega")}
        >
          Vega Constanța
        </button>

        <button type="button" className="link-btn" style={{ marginTop: 10, alignSelf: "center" }} onClick={onLogout}>
          Ieși din cont
        </button>
      </div>
    </div>
  );
}
