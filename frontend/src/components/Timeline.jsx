import React, { useRef } from "react";

function formatMMSS(seconds) {
  const total = Math.floor(seconds);
  const mins = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

export function Timeline({
  currentTime = 0,
  maxTime = 3600,
  isPlaying = false,
  playbackSpeed = 1,
  onTogglePlay,
  onRestart,
  onSeek,
  onChangeSpeed
}) {
  const trackRef = useRef(null);
  const progressPct = Math.min(100, Math.max(0, (currentTime / maxTime) * 100));

  const handleTrackClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = clickX / rect.width;
    onSeek(pct * maxTime);
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  const speeds = [0.5, 1, 2, 4];

  return (
    <div className="bottom-timeline-container">
      {/* Playback Controls */}
      <div className="timeline-action-group">
        <button
          className="timeline-btn timeline-btn-restart"
          onClick={onRestart}
          title="Restart from 00:00"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Restart</span>
        </button>

        <button
          className={`timeline-btn timeline-btn-play ${isPlaying ? "playing" : ""}`}
          onClick={onTogglePlay}
        >
          {isPlaying ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span>Play</span>
            </>
          )}
        </button>

        <div className="timeline-speed-toggle">
          {speeds.map(spd => (
            <button
              key={spd}
              className={`timeline-speed-chip ${playbackSpeed === spd ? "active" : ""}`}
              onClick={() => onChangeSpeed(spd)}
            >
              {spd}×
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber Track */}
      <div className="timeline-scrubber-track" ref={trackRef} onClick={handleTrackClick}>
        <span className="timeline-time-label font-mono">00:00</span>

        <div className="track-bar-wrapper">
          <div className="track-bar-bg">
            <div className="track-bar-fill" style={{ width: `${progressPct}%` }}></div>
          </div>

          <input
            type="range"
            min={0}
            max={maxTime}
            step={1}
            value={currentTime}
            onChange={handleSliderChange}
            className="timeline-range-input"
            aria-label="Simulation Time Scrubber"
          />

          {/* Draggable Scrubber Playhead */}
          <div
            className="timeline-playhead-indicator"
            style={{ left: `${progressPct}%` }}
          >
            <div className="playhead-knob"></div>
            <div className="playhead-tooltip font-mono">
              {formatMMSS(currentTime)}
            </div>
          </div>
        </div>

        <span className="timeline-time-label font-mono">60:00</span>
      </div>

      {/* Current Elapsed Callout */}
      <div className="timeline-elapsed-badge font-mono">
        <span className="elapsed-label">ELAPSED:</span>
        <span className="elapsed-val">{formatMMSS(currentTime)}</span>
      </div>
    </div>
  );
}
