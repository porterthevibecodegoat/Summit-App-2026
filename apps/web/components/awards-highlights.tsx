"use client";

import { useState } from "react";
import { ExternalLink, Play, X } from "lucide-react";
import styles from "./awards-highlights.module.css";

type AwardsHighlightsProps = {
  title: string;
  embedUrl: string;
  watchUrl: string;
  duration: string;
};

export function AwardsHighlights({ title, embedUrl, watchUrl, duration }: AwardsHighlightsProps) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  function play() {
    setFailed(false);
    setPlaying(true);
  }

  return <div className={styles.highlights}>
    <div className={styles.frame}>
      {playing ? <>
        <iframe src={`${embedUrl}${embedUrl.includes("?") ? "&" : "?"}autoplay=1`} title={title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
          onError={() => { setPlaying(false); setFailed(true); }} />
        <button type="button" className={styles.close} onClick={() => setPlaying(false)} aria-label="Close highlights video" title="Close video"><X size={18} aria-hidden="true" /></button>
      </> : <button type="button" className={styles.poster} onClick={play} aria-label="Play 2025 Not Alone Awards highlights" title="Play 2025 highlights">
        <img src="/images/awards-2025-highlights.jpg" alt="The 2025 Not Alone Awards celebration" loading="lazy" width={1280} height={720} />
        <span className={styles.play}><Play size={30} fill="currentColor" strokeWidth={1.5} aria-hidden="true" /></span>
        <span className={styles.duration} aria-hidden="true">{duration}</span>
      </button>}
    </div>
    <div className={styles.caption}>
      <p>{failed ? "The video could not load here." : "Music, stories, and moments from the 2025 Not Alone Awards."}</p>
      <a href={watchUrl} target="_blank" rel="noreferrer">Watch on YouTube <ExternalLink size={15} aria-hidden="true" /></a>
    </div>
  </div>;
}
