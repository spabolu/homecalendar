import { useState, useEffect, useMemo } from "preact/hooks";

// timezone settings
const TIMEZONES = [
  {
    id: "local",
    timezone: undefined, // use system timezone
    emoji:
      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f3e0.svg", // using twemoji cuz i can't figure out raspberry pi's emoji support
    alt: "Local",
  },
  {
    id: "nyc",
    timezone: "America/New_York",
    emoji:
      "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f5fd.png", // using twemoji cuz i can't figure out raspberry pi's emoji support
    alt: "NYC",
  },
  {
    id: "ist",
    timezone: "Asia/Kolkata",
    emoji:
       "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f1ee-1f1f3.svg", // using twemoji cuz i can't figure out raspberry pi's emoji support
    alt: "IST",
  },
];

// world clock component
const WorldClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // formatters for different timezones
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex items-center space-x-4">
        {formatters.map((config, index) => (
          <>
            <div
              key={config.id}
              className="inline-flex space-x-2 text-2xl"
            >
              <img src={config.emoji} alt={config.alt} className="w-6 h-6" />
              <span className="font-semibold font-mono text-gray-900">
                {config.formatter.format(currentTime)}
              </span>
            </div>
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
