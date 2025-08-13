import { useEffect, useMemo, useState } from "preact/hooks";

// Configuration for the timezones to be displayed in the world clock.
// Used Twemoji SVGs for better compatibility with Raspberry Pi
const TIMEZONES = [
  {
    id: "local",
    timezone: undefined, // Uses the system's local timezone.
    emoji:
      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3e0.svg", // Home emoji
    alt: "Local",
  },
  {
    id: "nyc",
    timezone: "America/New_York",
    emoji:
      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f5fd.png", // Statue of Liberty emoji
    alt: "NYC",
  },
  {
    id: "ist",
    timezone: "Asia/Kolkata",
    emoji:
      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ee-1f1f3.svg", // Flag of India emoji
    alt: "IST",
  },
];

/**
 * A component that displays the current time in different timezones.
 * The timezones are configured in the TIMEZONES constant.
 */
const WorldClock = () => {
  // State to hold the current time, updated every second.
  const [currentTime, setCurrentTime] = useState(new Date());

  // Memoized formatters for each timezone to avoid re-creating them on every render.
  const formatters = useMemo(() => {
    return TIMEZONES.map((tz) => ({
      ...tz,
      formatter: new Intl.DateTimeFormat("en-US", {
        timeZone: tz.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    }));
  }, []);

  // Effect to update the current time every second.
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup function to clear the interval when the component unmounts.
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex items-center space-x-4">
        {formatters.map((config, index) => (
          <>
            <div key={config.id} className="inline-flex space-x-2 text-2xl">
              <img src={config.emoji} alt={config.alt} className="w-6 h-6" />
              <span className="font-semibold font-mono text-gray-900">
                {config.formatter.format(currentTime)}
              </span>
            </div>
            {/* separator */}
            {index < formatters.length - 1 && (
              <div className="w-px h-5 bg-gray-400"></div>
            )}
          </>
        ))}
      </div>
    </div>
  );
};

export default WorldClock;
