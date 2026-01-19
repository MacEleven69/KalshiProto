import { TimelineEvent } from "../types";

interface TimelineStripProps {
  timeline: TimelineEvent[];
}

const eventConfig: Record<TimelineEvent["type"], { icon: string; color: string; bg: string }> = {
  OPEN: { icon: "▲", color: "text-whale-buy", bg: "bg-whale-buy/30" },
  CLOSE: { icon: "▼", color: "text-whale-sell", bg: "bg-whale-sell/30" },
  WHALE: { icon: "🐋", color: "text-whale-gold", bg: "bg-whale-gold/30" },
  REGIME_CHANGE: { icon: "◆", color: "text-purple-400", bg: "bg-purple-500/30" },
};

const EventMarker = ({ 
  event, 
  position, 
}: { 
  event: TimelineEvent; 
  position: number;
}) => {
  const config = eventConfig[event.type];
  const time = new Date(event.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 group cursor-pointer"
      style={{ left: `${position}%` }}
    >
      {/* Marker dot */}
      <div
        className={`w-6 h-6 rounded-full ${config.bg} ${config.color} flex items-center justify-center 
                    text-xs border border-current/50 transition-all duration-200
                    group-hover:scale-125 group-hover:border-white/50`}
      >
        {config.icon}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 
                      transition-opacity duration-200 pointer-events-none z-10">
        <div className="bg-whale-darker border border-whale-accent/30 rounded-lg p-2 shadow-xl whitespace-nowrap">
          <div className="text-xs font-mono text-gray-400">{time}</div>
          <div className={`text-sm font-bold ${config.color}`}>
            {event.type}
          </div>
          {event.ticker && (
            <div className="text-xs text-whale-accent font-mono mt-1">
              {event.ticker.slice(0, 20)}
            </div>
          )}
          {event.details && (
            <div className="text-xs text-gray-400 mt-1 max-w-[150px] truncate">
              {event.details}
            </div>
          )}
        </div>
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-whale-darker" />
      </div>
    </div>
  );
};

export function TimelineStrip({ timeline }: TimelineStripProps) {
  if (timeline.length === 0) {
    return (
      <div className="bg-whale-card rounded-xl border border-whale-accent/20 p-4">
        <h2 className="font-display text-sm font-bold text-white mb-2">Timeline</h2>
        <div className="h-12 flex items-center justify-center text-gray-500 text-sm">
          No events yet
        </div>
      </div>
    );
  }

  // Parse timestamps and compute positions
  const timestamps = timeline.map((e) => new Date(e.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeRange = maxTime - minTime || 1; // Avoid division by zero

  const eventsWithPosition = timeline.map((event) => {
    const time = new Date(event.timestamp).getTime();
    const position = ((time - minTime) / timeRange) * 90 + 5; // 5%-95% range
    return { event, position };
  });

  // Format time range for display
  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-whale-card rounded-xl border border-whale-accent/20 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-bold text-white flex items-center gap-2">
          <span>📈</span>
          Activity Timeline
        </h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {Object.entries(eventConfig).map(([type, config]) => (
            <div key={type} className="flex items-center gap-1">
              <span className={config.color}>{config.icon}</span>
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline strip */}
      <div className="relative h-16">
        {/* Track line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-whale-darker -translate-y-1/2 rounded-full" />
        
        {/* Gradient overlay */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 
                        bg-gradient-to-r from-whale-accent/30 via-whale-gold/30 to-whale-accent/30" />

        {/* Event markers */}
        {eventsWithPosition.map(({ event, position }, idx) => (
          <EventMarker key={`${event.timestamp}-${idx}`} event={event} position={position} />
        ))}
      </div>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-gray-500 font-mono mt-1">
        <span>{formatTime(minTime)}</span>
        <span>{formatTime(maxTime)}</span>
      </div>
    </div>
  );
}

export default TimelineStrip;
