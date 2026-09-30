"use client";

// Ecran scurt, afisat imediat dupa un login reusit, inainte sa intri pe
// dashboard - un zambet animat + un mesaj personalizat cu numele, ca sa
// simta ca aplicatia "te intampina", nu doar te arunca direct in liste de
// referate. Dispare singur dupa putin timp (vezi timeout-ul din page.js).
const GREETINGS = [
  "Hai să pregătim referatele de azi ✨",
  "Toate cererile te așteaptă, organizate ✨",
  "O zi bună înseamnă o listă la zi ✨",
];

export default function WelcomeSplash({ name }) {
  const firstName = (name || "").trim().split(" ")[0] || "acolo";
  const greeting = GREETINGS[new Date().getDate() % GREETINGS.length];

  return (
    <div id="login-screen">
      <div className="login-box welcome-box">
        <div className="welcome-smiley">
          <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="42" cy="42" r="38" stroke="var(--primary)" strokeWidth="4" />
            <circle cx="29" cy="33" r="4.5" fill="var(--primary)" />
            <circle cx="55" cy="33" r="4.5" fill="var(--primary)" />
            <path
              d="M25 48c4.5 9 13.5 15 17 15s12.5-6 17-15"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>
        <h1>Bine ai revenit, {firstName}!</h1>
        <p className="subtitle">{greeting}</p>
      </div>
    </div>
  );
}
