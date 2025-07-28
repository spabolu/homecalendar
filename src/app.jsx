import { useEffect, useRef, useState } from "preact/hooks";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import ICAL from "ical.js";

export function App() {
  const calendarRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cache for iCal data - stores { data: string, timestamp: number }
  const icalCache = useRef(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const fetchCalendarEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Normalize webcal protocol to https for fetch compatibility (e.g., Google private iCal links)
      const rawUrl = import.meta.env.VITE_ICAL_URL;
      const icalUrl = rawUrl ? rawUrl.replace(/^webcal:\/\//i, "https://") : "";
      if (!icalUrl) {
        throw new Error("Please set VITE_ICAL_URL in your .env file");
      }

      // Check if we have valid cached data
      const now = Date.now();
      let icalData;
      
      if (icalCache.current && 
          icalCache.current.timestamp && 
          (now - icalCache.current.timestamp) < CACHE_DURATION) {
        // Use cached data
        console.log("Using cached iCal data");
        icalData = icalCache.current.data;
      } else {
        // Fetch fresh data
        console.log("Fetching fresh iCal data");
        
        const sharedSecret = import.meta.env.VITE_SHARED_SECRET;
        if (!sharedSecret) {
          throw new Error("Please set VITE_SHARED_SECRET in your .env file");
        }

        const fetchOptions = {
          headers: {
            "x-ical-key": sharedSecret,
          },
        };

        const response = await fetch(icalUrl, fetchOptions);
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(`Worker returned ${response.status}: ${errorText}`);
        }
        icalData = await response.text();
        
        // Update cache
        icalCache.current = {
          data: icalData,
          timestamp: now
        };
      }

      // Parse the iCal data
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents("vevent");

      const calendarEvents = [];

      // Define a reasonable expansion window: 1 month back to 1 year forward
      const nowDate = new Date();
      const rangeStart = ICAL.Time.fromJSDate(
        new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, nowDate.getDate())
      );
      const rangeEnd = ICAL.Time.fromJSDate(
        new Date(nowDate.getFullYear() + 1, nowDate.getMonth(), nowDate.getDate())
      );

      vevents.forEach((vevent) => {
        const event = new ICAL.Event(vevent);

        // Handle recurring events by expanding occurrences within the defined range
        if (event.isRecurring()) {
          const iterator = event.iterator();
          let next;
          let iterations = 0;
          const MAX_ITERATIONS = 1000; // safety guard to prevent infinite loops

          while ((next = iterator.next())) {
            if (next.compare(rangeEnd) > 0 || iterations > MAX_ITERATIONS)
              break;
            iterations += 1;

            // Only include occurrences within our desired window
            if (next.compare(rangeStart) >= 0) {
              const occ = event.getOccurrenceDetails(next);
              calendarEvents.push({
                id: `${event.uid || event.summary}-${next.toString()}`,
                title: event.summary || "Untitled Event",
                start: occ.startDate.toJSDate(),
                end: occ.endDate ? occ.endDate.toJSDate() : null,
                allDay: occ.startDate.isDate,
              });
            }
          }
        } else {
          // Single (non-recurring) events
          if (event.startDate) {
            calendarEvents.push({
              id: event.uid || `${event.summary}-${event.startDate}`,
              title: event.summary || "Untitled Event",
              start: event.startDate.toJSDate(),
              end: event.endDate ? event.endDate.toJSDate() : null,
              allDay: event.startDate.isDate,
            });
          }
        }
      });

      // Final tidy-up: filter invalid items and update state
      setEvents(calendarEvents.filter((ev) => ev.start && ev.title));
    } catch (err) {
      console.error("Error fetching calendar events:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();

    // Auto refresh calendar every 15 minutes
    const interval = setInterval(() => {
      fetchCalendarEvents();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="h-screen bg-white font-['Inter',sans-serif] flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Calendar Error
          </div>
          <div className="text-gray-600 mb-4 text-sm">{error}</div>
          <div className="text-xs text-gray-500 mb-4">
            Make sure your .env file contains VITE_ICAL_URL with a valid public
            iCal URL
          </div>
          <button
            onClick={fetchCalendarEvents}
            className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen bg-white font-['Inter',sans-serif] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading Calendar...</div>
          <div className="text-gray-600">Fetching events from iCal source</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white font-['Inter',sans-serif]">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, dayGridPlugin]}
        initialView="timeGridWeek"
        events={events}
        headerToolbar={{
          left: "title",
          center: "",
          right: "prev,next",
        }}
        dayHeaderFormat={{
          weekday: "short",
          month: "numeric",
          day: "numeric",
        }}
        allDaySlot={true}
        allDayText="all-day"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        nowIndicator={true}
        contentHeight="auto"
        expandRows={true}
        editable={false}
        selectable={false}
        eventStartEditable={false}
        eventDurationEditable={false}
        eventResizableFromStart={false}
        droppable={false}
        eventDisplay="block"
        displayEventTime={false}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: false,
        }}
      />
    </div>
  );
}
