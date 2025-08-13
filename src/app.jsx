import dayGridPlugin from "@fullcalendar/daygrid";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import ICAL from "ical.js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import WorldClock from "./components/WorldClock";

/**
 * This is the main application component.
 * It renders a FullCalendar instance with events fetched from an iCal feed.
 * It also includes a WorldClock component.
 */

// constants for better performance
const FETCH_INTERVAL = 2 * 60 * 1000; // 2 minutes
const TIME_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
const HOURS_TO_SHOW = 15;
const HOURS_BEFORE = 4;
const MAX_RECURRING_EVENTS = 1000;

// Parse family configuration from environment variables, with a fallback to an empty array.
const FAMILY_CONFIG_RAW = JSON.parse(
  import.meta.env.VITE_FAMILY_CONFIG || "[]"
);

// Convert the array of family members into a lookup object for efficient access.
// The key is the family member's name, and the value is their configuration.
const FAMILY_CONFIG = FAMILY_CONFIG_RAW.reduce((acc, member) => {
  acc[member.name] = member;
  return acc;
}, {});

// Dynamically create a regex to find names in titles based on FAMILY_CONFIG.
// This avoids hardcoding names and makes the component more reusable.
const familyMemberNames = Object.keys(FAMILY_CONFIG).filter(
  (name) => name !== "Family"
);
const TITLE_PATTERN = new RegExp(`^(${familyMemberNames.join("|")}):\\s*`, "i");

// helper functions
const getFamilyMemberColor = (name) =>
  FAMILY_CONFIG[name]?.color || FAMILY_CONFIG.Family.color;
const getInitials = (name) =>
  FAMILY_CONFIG[name]?.initials || name.charAt(0).toUpperCase();

const formatHour = (hour) => `${hour.toString().padStart(2, "0")}:00:00`;

const formatTime = (date) => {
  const minutes = date.getMinutes();
  const options = { hour: "numeric", hour12: true };
  if (minutes !== 0) options.minute = "2-digit";
  return new Intl.DateTimeFormat("en-US", options)
    .format(date)
    .toLowerCase()
    .replace(" ", "");
};

const getOptimalTimeWindow = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const hoursAfter = HOURS_TO_SHOW - HOURS_BEFORE;

  let startHour = Math.max(0, currentHour - HOURS_BEFORE);
  let endHour = Math.min(24, currentHour + hoursAfter);

  // make sure hours are correct
  if (startHour === 0 && currentHour < HOURS_BEFORE) {
    endHour = Math.min(24, HOURS_TO_SHOW);
  }
  if (endHour === 24 && currentHour > 24 - hoursAfter) {
    startHour = Math.max(0, 24 - HOURS_TO_SHOW);
  }

  return {
    slotMinTime: formatHour(startHour),
    slotMaxTime: formatHour(endHour),
  };
};

const extractOrganizerInfo = (event) => {
  try {
    // get organizer from ical event
    const organizerProp = event.component.getFirstProperty("organizer");
    if (organizerProp) {
      const email = organizerProp.getFirstValue();
      const cleanEmail = email?.replace(/^mailto:/i, "");
      const cnParam = organizerProp.getParameter("cn");
      const name = cnParam || cleanEmail || "Family";
      return {
        name,
        email: cleanEmail,
        source: "organizer_property",
        color: getFamilyMemberColor(name),
      };
    }

    // or get name from event title
    const title = event.summary || "";
    const titleMatch = title.match(TITLE_PATTERN);
    if (titleMatch) {
      const name =
        titleMatch[1].charAt(0).toUpperCase() +
        titleMatch[1].slice(1).toLowerCase();
      return {
        name,
        email: null,
        source: "title_pattern",
        color: getFamilyMemberColor(name),
      };
    }

    // if no name found, default to family
    return {
      name: "Family",
      email: null,
      source: "default",
      color: getFamilyMemberColor("Family"),
    };
  } catch (e) {
    console.warn("Error parsing organizer info:", e);
    return {
      name: "Family",
      email: null,
      source: "default",
      color: getFamilyMemberColor("Family"),
    };
  }
};

// function to create calendar events
const createCalendarEvent = (eventData, organizer) => {
  const { id, title: rawTitle, start, end, allDay, description } = eventData;

  // remove name from title if it's there
  let title = rawTitle || "untitled";
  if (organizer.source === "title_pattern") {
    title = title.replace(TITLE_PATTERN, "").trim();
  }

  return {
    id,
    title,
    start,
    end,
    allDay,
    backgroundColor: organizer.color,
    borderColor: organizer.color,
    textColor: "#fff",
    extendedProps: {
      organizer,
      description: description || "",
    },
  };
};

export function App() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // for the time display on the side
  const currentTimeSlots = useMemo(() => getOptimalTimeWindow(), []);
  const [timeSlots, setTimeSlots] = useState(currentTimeSlots);

  // so we don't recalculate dates
  const dateRanges = useMemo(() => {
    const today = new Date();
    return {
      startRange: ICAL.Time.fromJSDate(
        new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
      ),
      endRange: ICAL.Time.fromJSDate(
        new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
      ),
    };
  }, []);

  const fetchCalendarEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rawUrl = import.meta.env.VITE_CLOUDFLARE_URL;
      const icalUrl = rawUrl?.replace(/^webcal:\/\//i, "https://");
      if (!icalUrl) throw new Error("VITE_CLOUDFLARE_URL not set");

      console.log("Fetching iCal data");
      const secret = import.meta.env.VITE_SHARED_SECRET;
      if (!secret) throw new Error("VITE_SHARED_SECRET not set");

      const response = await fetch(icalUrl, {
        headers: { "x-ical-key": secret },
      });
      if (!response.ok) throw new Error(`Worker error: ${response.status}`);

      const icalData = await response.text();

      const jcal = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcal);
      const vevents = comp.getAllSubcomponents("vevent");

      const { startRange, endRange } = dateRanges;
      const calEvents = [];

      vevents.forEach((ve) => {
        const ev = new ICAL.Event(ve);
        const organizer = extractOrganizerInfo(ev);

        if (ev.isRecurring()) {
          // for recurring events
          const iter = ev.iterator();
          let next,
            count = 0;

          while ((next = iter.next()) && count < MAX_RECURRING_EVENTS) {
            if (next.compare(endRange) > 0) break;
            count++;

            if (next.compare(startRange) >= 0) {
              const occurrence = ev.getOccurrenceDetails(next);
              calEvents.push(
                createCalendarEvent(
                  {
                    id: `${ev.uid}-${next}`,
                    title: ev.summary,
                    start: occurrence.startDate.toJSDate(),
                    end: occurrence.endDate?.toJSDate() || null,
                    allDay: occurrence.startDate.isDate,
                    description: ev.description,
                  },
                  organizer
                )
              );
            }
          }
        } else if (ev.startDate) {
          // for single events
          calEvents.push(
            createCalendarEvent(
              {
                id: ev.uid || ev.summary,
                title: ev.summary,
                start: ev.startDate.toJSDate(),
                end: ev.endDate?.toJSDate() || null,
                allDay: ev.startDate.isDate,
                description: ev.description,
              },
              organizer
            )
          );
        }
      });

      setEvents(calEvents.filter((e) => e.start && e.title));
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRanges]);

  // how events look on the calendar
  const eventContent = useCallback((eventInfo) => {
    const { event } = eventInfo;
    const organizer = event.extendedProps.organizer;
    const start = formatTime(event.start);
    const end = event.end ? formatTime(event.end) : null;

    return (
      <div className="p-1 text-xs relative h-full">
        <div className="truncate font-semibold text-xl subpixel-antialiased">
          {event.title}
        </div>
        <div className="text-base opacity-90 font-medium subpixel-antialiased">
          {`${start}${end && end !== start ? ` - ${end}` : ""}`}
        </div>
        {organizer?.name !== "Family" && (
          <div
            className="absolute w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{
              backgroundColor: "rgba(0,0,0,0.9)",
              width: "24px",
              height: "24px",
              fontSize: "12px",
              bottom: "3px",
              right: "0px",
            }}
          >
            {getInitials(organizer.name)}
          </div>
        )}
      </div>
    );
  }, []);

  // for tooltips on hover
  const eventDidMount = useCallback((info) => {
    const { organizer, description } = info.event.extendedProps;
    let tooltip = "";

    if (organizer) {
      tooltip =
        organizer.source === "organizer_property"
          ? `Created by: ${organizer.name}${
              organizer.email ? ` (${organizer.email})` : ""
            }`
          : organizer.source === "title_pattern"
          ? `Event by: ${organizer.name}`
          : "Family event";
    }

    if (description) tooltip += `\n\nDescription: ${description}`;

    info.el.title = tooltip;
    info.el.style.cursor = "pointer";
  }, []);

  // fullcalendar settings
  const calendarConfig = useMemo(
    () => ({
      plugins: [timeGridPlugin, dayGridPlugin],
      initialView: "timeGridWeek",
      headerToolbar: { left: "title", center: "", right: "prev,next" },
      dayHeaderFormat: { weekday: "short", month: "numeric", day: "numeric" },
      allDaySlot: true,
      allDayText: "all-day",
      slotDuration: "00:30:00",
      slotLabelInterval: "01:00:00",
      nowIndicator: true,
      height: "100%",
      // height: "auto",
      expandRows: false,
      editable: false,
      selectable: false,
      eventDisplay: "block",
      displayEventTime: true,
      eventTimeFormat: {
        hour: "numeric",
        minute: "2-digit",
        meridiem: "short",
        omitZeroMinute: true,
      },
    }),
    []
  );

  // update time window every so often
  useEffect(() => {
    const updateTimeSlots = () => setTimeSlots(getOptimalTimeWindow());

    updateTimeSlots();
    const interval = setInterval(updateTimeSlots, TIME_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // get calendar data when page loads and then every few minutes
  useEffect(() => {
    fetchCalendarEvents();
    const interval = setInterval(fetchCalendarEvents, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCalendarEvents]);

  // Show the full-page loader or error screen ONLY during the very first load
  if (error && events.length === 0) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="p-8 max-w-md text-center">
          <div className="text-red-600 mb-2">Calendar error</div>
          <div className="text-gray-600 mb-4 text-sm">{error}</div>
          <button
            onClick={fetchCalendarEvents}
            className="px-4 py-2 bg-black text-white text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && events.length === 0) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-semibold">Loading calendar...</div>
          <div className="text-gray-600">Fetching events</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <WorldClock />
      <div className="relative h-screen bg-white">
        <FullCalendar
          ref={calendarRef}
          {...calendarConfig}
          events={events}
          slotMinTime={timeSlots.slotMinTime}
          slotMaxTime={timeSlots.slotMaxTime}
          eventContent={eventContent}
          eventDidMount={eventDidMount}
        />
        {/* Overlay while silently refreshing events */}
        {loading && events.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 py-2 bg-white shadow-md z-20 flex items-center justify-center pointer-events-none">
            <div className="text-gray-600 text-xl font-bold">Refreshing…</div>
          </div>
        )}
      </div>
    </>
  );
}
