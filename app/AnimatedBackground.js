"use client";

import { useEffect, useRef } from "react";

// Fundal decorativ, global (in spatele intregii aplicatii - login si
// dashboard deopotriva): cateva "blob"-uri difuze, in culorile aplicatiei
// (indigo), care plutesc incontinuu si se misca usor dupa cursor (parallax).
//
// E facut sa fie ieftin de rulat:
// - doar 3 elemente, fara librarii externe (canvas/svg/particule)
// - miscarea de plutire e CSS (@keyframes), rulata de compositor-ul
//   browserului, nu de JS
// - miscarea dupa mouse e un singur listener pe window, care doar seteaza
//   un "transform" direct pe elemente (fara re-render React, fara state)
// - "pointer-events: none" ca sa nu blocheze niciodata click-urile pe
//   continutul real de deasupra
export default function AnimatedBackground() {
  const wrapRefs = useRef([]);
  const frame = useRef(null);

  useEffect(() => {
    // Pe telefon/tableta (fara mouse real) sarim peste listener-ul de
    // parallax - blob-urile tot plutesc din CSS, doar ca nu mai urmaresc
    // degetul (ar fi doar zgomot pe touch).
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canHover) return;

    function onMove(e) {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const mx = e.clientX / window.innerWidth - 0.5; // -0.5 .. 0.5
        const my = e.clientY / window.innerHeight - 0.5;
        wrapRefs.current.forEach((el) => {
          if (!el) return;
          const depth = Number(el.dataset.depth || 0);
          el.style.transform = `translate3d(${mx * depth}px, ${my * depth}px, 0)`;
        });
      });
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div className="bg-blobs" aria-hidden="true">
      <div className="blob-wrap" data-depth="26" ref={(el) => (wrapRefs.current[0] = el)}>
        <div className="blob blob-a" />
      </div>
      <div className="blob-wrap" data-depth="18" ref={(el) => (wrapRefs.current[1] = el)}>
        <div className="blob blob-b" />
      </div>
      <div className="blob-wrap" data-depth="34" ref={(el) => (wrapRefs.current[2] = el)}>
        <div className="blob blob-c" />
      </div>
    </div>
  );
}
