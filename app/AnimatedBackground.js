"use client";

import { useEffect, useRef, useState } from "react";

// Fundal decorativ, global (in spatele intregii aplicatii - login si
// dashboard deopotriva).
//
// - Pe orice ecran: 4 "blob"-uri mari, difuze, in indigo (culorile
//   aplicatiei), care plutesc INCONTINUU dintr-o animatie CSS (@keyframes) -
//   rulata de compositor-ul browserului, ieftina, merge si pe telefon.
// - DOAR pe laptop/desktop (cursor real, detectat cu "hover: hover and
//   pointer: fine"): in plus, un glow care URMARESTE cursorul lin (interpolat
//   cadru cu cadru - de-aia se simte "viu", nu doar sare la pozitia mouse-ului)
//   si blob-urile capata si ele o usoara paralaxa dupa cursor.
// - Pe telefon/tableta (fara mouse): NIMIC interactiv - nu se ataseaza
//   niciun listener de mouse/touch, deci zero cost in plus fata de blob-urile
//   care oricum plutesc din CSS.
export default function AnimatedBackground() {
  const [interactive, setInteractive] = useState(false);
  const glowRef = useRef(null);
  const wrapRefs = useRef([]);
  const raf = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const started = useRef(false);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setInteractive(canHover);
    if (!canHover) return;

    target.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    current.current = { ...target.current };

    function onMove(e) {
      target.current = { x: e.clientX, y: e.clientY };
      if (!started.current) {
        // Prima miscare a mouse-ului - pornim glow-ul si loop-ul de animatie.
        started.current = true;
        if (glowRef.current) glowRef.current.classList.add("cursor-glow-visible");
        loop();
      }
    }

    function loop() {
      // Interpolare lina (lerp) catre pozitia cursorului - da senzatia de
      // miscare "vie", nu de teleportare instant la fiecare pixel.
      current.current.x += (target.current.x - current.current.x) * 0.09;
      current.current.y += (target.current.y - current.current.y) * 0.09;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%)`;
      }

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (current.current.x - cx) / cx; // -1 .. 1
      const dy = (current.current.y - cy) / cy;

      wrapRefs.current.forEach((el) => {
        if (!el) return;
        const depth = Number(el.dataset.depth || 0);
        el.style.transform = `translate3d(${dx * depth}px, ${dy * depth}px, 0)`;
      });

      raf.current = requestAnimationFrame(loop);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="bg-blobs" aria-hidden="true">
      <div className="blob-wrap" data-depth="34" ref={(el) => (wrapRefs.current[0] = el)}>
        <div className="blob blob-a" />
      </div>
      <div className="blob-wrap" data-depth="22" ref={(el) => (wrapRefs.current[1] = el)}>
        <div className="blob blob-b" />
      </div>
      <div className="blob-wrap" data-depth="44" ref={(el) => (wrapRefs.current[2] = el)}>
        <div className="blob blob-c" />
      </div>
      <div className="blob-wrap" data-depth="28" ref={(el) => (wrapRefs.current[3] = el)}>
        <div className="blob blob-d" />
      </div>
      {interactive && <div className="cursor-glow" ref={glowRef} />}
    </div>
  );
}
