import React from "react";

export function EventFeed({ events = [] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="event-feed-overlay">
      <div className="event-feed-header">
        <span className="event-feed-pulse"></span>
        <span className="event-feed-title">MISSION DISPATCH FEED</span>
      </div>
      <div className="event-feed-list">
        {events.slice(0, 4).map((evt) => (
          <div key={evt.id} className={`event-feed-item event-${evt.type}`}>
            <div className="event-item-top">
              <span className="event-tag font-mono">{evt.badge}</span>
              <span className="event-time font-mono">{evt.timeStr}</span>
            </div>
            <div className="event-msg">{evt.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
