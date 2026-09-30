"use client";

import { useEffect, useState } from "react";

// Buton rotund, fix in coltul din dreapta-jos, care apare doar dupa ce ai
// derulat suficient pe pagina (peste ~400px) si te duce instant inapoi sus,
// cu scroll lin. Global - apare pe orice pagina, inclusiv in Camin Romantic
// si Vega Constanta, oriunde e nevoie de el (dispare singur cand esti deja
// sus, ca sa nu stea degeaba pe ecran).
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top-btn"
      aria-label="Înapoi sus"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 19V5M12 5L6 11M12 5L18 11"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
