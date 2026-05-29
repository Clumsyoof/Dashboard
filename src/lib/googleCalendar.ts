import type { ScheduleBlock } from '../types';

export const typeColors: Record<string, string> = {
  study: '#7dcfff',
  exam: '#f7768e',
  conference: '#e0af68',
  task: '#9ece6a',
  holiday: '#bb9af3'
};

function getSystemTimezoneOffset(): string {
  const offset = new Date().getTimezoneOffset();
  const abs = Math.abs(offset);
  const sign = offset > 0 ? '-' : '+';
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

/** Pushes a block to Google Calendar. Returns the new googleEventId or null. */
export async function pushEventToGoogleAPI(
  block: ScheduleBlock,
  accessToken: string
): Promise<string | null> {
  const gEvent = {
    summary: block.subjectName,
    description: `Dashboard Event #${block.type || 'study'}`,
    start: block.startTime
      ? { dateTime: `${block.date}T${block.startTime}:00${getSystemTimezoneOffset()}` }
      : { date: block.date },
    end: block.endTime
      ? { dateTime: `${block.date}T${block.endTime}:00${getSystemTimezoneOffset()}` }
      : { date: block.date },
    recurrence: block.recurrenceRule ? [block.recurrenceRule] : undefined
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(gEvent)
  });

  if (res.ok) {
    const data = await res.json();
    return data.id as string;
  }
  throw new Error(`Failed to push event. Status: ${res.status}`);
}

/** Deletes a Google Calendar event by ID. */
export async function deleteGoogleEvent(googleEventId: string): Promise<void> {
  const accessToken = sessionStorage.getItem('gdrive_access_token');
  if (!accessToken) return;
  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (e) {
    console.error('Failed to delete google event', e);
  }
}

/**
 * Syncs Google Calendar + Indian holidays into the local schedule.
 * Calls updateSchedule() with the merged result.
 * Calls setSyncState() to communicate loading / done / error to the caller.
 */
export async function syncGoogleCalendar(
  currentSchedule: ScheduleBlock[],
  updateSchedule: (s: ScheduleBlock[]) => void,
  setSyncState: (syncing: boolean, message: string) => void,
  currentYear: number,
  currentMonth: number
): Promise<void> {
  const accessToken = sessionStorage.getItem('gdrive_access_token');
  if (!accessToken) {
    setSyncState(false, 'Authorize via Cloud Sync first');
    setTimeout(() => setSyncState(false, ''), 3000);
    return;
  }

  setSyncState(true, 'Syncing...');
  const backupSchedule = JSON.parse(JSON.stringify(currentSchedule)) as ScheduleBlock[];

  try {
    const [resPrimary, resHolidays] = await Promise.all([
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date(currentYear, currentMonth - 2, 1).toISOString()}&maxResults=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://www.googleapis.com/calendar/v3/calendars/en.indian%23holiday%40group.v.calendar.google.com/events?timeMin=${new Date(currentYear, 0, 1).toISOString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    ]);

    if (!resPrimary.ok || !resHolidays.ok) {
      throw new Error(`API error: ${resPrimary.status} / ${resHolidays.status}`);
    }

    const [dataPrimary, dataHolidays] = await Promise.all([
      resPrimary.json(),
      resHolidays.json()
    ]);

    const syncedBlocks: ScheduleBlock[] = [];

    // Parse primary calendar
    if (dataPrimary.items) {
      for (const item of dataPrimary.items) {
        const dateStr = item.start?.date || (item.start?.dateTime ? item.start.dateTime.split('T')[0] : '');
        if (!dateStr) continue;
        const existing = currentSchedule.find(b => b.googleEventId === item.id);
        let type: ScheduleBlock['type'] = 'study';
        if (item.description?.includes('#exam')) type = 'exam';
        if (item.description?.includes('#conference')) type = 'conference';
        if (item.description?.includes('#task')) type = 'task';
        let startTime = '09:00', endTime = '10:00';
        if (item.start?.dateTime && item.end?.dateTime) {
          startTime = item.start.dateTime.split('T')[1].substring(0, 5);
          endTime   = item.end.dateTime.split('T')[1].substring(0, 5);
        }
        syncedBlocks.push({
          id: existing ? existing.id : crypto.randomUUID(),
          googleEventId: item.id,
          subjectName: item.summary || 'Busy',
          type, date: dateStr, startTime, endTime,
          isRecurring: !!item.recurrence,
          color: existing ? existing.color : (typeColors[type] ?? typeColors.study)
        });
      }
    }

    // Parse holidays
    if (dataHolidays.items) {
      for (const item of dataHolidays.items) {
        const dateStr = item.start?.date;
        if (!dateStr) continue;
        if (syncedBlocks.find(b => b.subjectName === item.summary && b.date === dateStr)) continue;
        syncedBlocks.push({
          id: crypto.randomUUID(),
          googleEventId: item.id,
          subjectName: item.summary,
          type: 'holiday',
          date: dateStr,
          startTime: '', endTime: '',
          isRecurring: false,
          color: typeColors.holiday
        });
      }
    }

    const localUnsynced = currentSchedule.filter(b => !b.googleEventId && b.type !== 'holiday');
    let newSchedule = [...syncedBlocks, ...localUnsynced];
    updateSchedule(newSchedule);

    // Push local-only events to Google
    for (const block of localUnsynced) {
      try {
        const googleId = await pushEventToGoogleAPI(block, accessToken);
        if (googleId) {
          newSchedule = newSchedule.map(b => b.id === block.id ? { ...b, googleEventId: googleId } : b);
        }
      } catch { /* best-effort */ }
    }
    updateSchedule(newSchedule);
    setSyncState(false, 'Synced ✓');
  } catch (e) {
    console.error('Google Calendar Sync Error:', e);
    updateSchedule(backupSchedule); // rollback
    setSyncState(false, 'Error — rolled back');
  }

  setTimeout(() => setSyncState(false, ''), 3000);
}
