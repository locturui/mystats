'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DateRange {
  start: Date;
  end: Date;
}

interface Props {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  trigger: React.ReactNode;
}

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function sod(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function sameDay(a: Date, b: Date) { return a.getTime() === b.getTime(); }

export function DateRangePicker({ value, onChange, trigger }: Props) {
  const today = sod(new Date());
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [draft, setDraft] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [hover, setHover] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function openPicker() {
    setDraft({ start: value?.start ?? null, end: value?.end ?? null });
    setOpen(true);
  }

  function clickDay(day: Date) {
    if (day > today) return;
    if (!draft.start || (draft.start && draft.end)) {
      setDraft({ start: day, end: null });
    } else {
      setDraft(draft.start <= day
        ? { start: draft.start, end: day }
        : { start: day, end: null });
    }
  }

  function effectiveEnd(): Date | null {
    if (draft.end) return draft.end;
    if (draft.start && hover && hover >= draft.start) return hover;
    return null;
  }

  function getState(day: Date) {
    const s = draft.start;
    const e = effectiveEnd();
    return {
      isStart: !!(s && sameDay(day, s)),
      isEnd: !!(e && sameDay(day, e)),
      inRange: !!(s && e && day > s && day < e),
    };
  }

  function gridDays(): (Date | null)[] {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const count = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= count; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function apply() {
    if (draft.start && draft.end) { onChange({ start: draft.start, end: draft.end }); setOpen(false); }
  }

  const atMax = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();
  const dayCount = draft.start && draft.end
    ? Math.round((draft.end.getTime() - draft.start.getTime()) / 86400000) + 1 : null;

  const Calendar = () => (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
        <button
          onClick={() => !atMax && setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
          disabled={atMax}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-white/25 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {gridDays().map((day, i) => {
          if (!day) return <div key={i} className="h-10" />;
          const future = day > today;
          const { isStart, isEnd, inRange } = getState(day);
          const isToday = sameDay(day, today);
          const selected = isStart || isEnd;

          return (
            <div
              key={i}
              className="relative h-10 flex items-center justify-center"
              onClick={() => !future && clickDay(day)}
              onMouseEnter={() => { if (draft.start && !draft.end) setHover(day); }}
              onMouseLeave={() => setHover(null)}
            >
              {(inRange || (isStart && effectiveEnd()) || isEnd) && (
                <div className={[
                  'absolute inset-y-[6px] bg-spotify-green/15 pointer-events-none',
                  isStart && !isEnd ? 'left-1/2 right-0 rounded-r-none' :
                  isEnd && !isStart ? 'right-1/2 left-0 rounded-l-none' :
                  'inset-x-0',
                ].join(' ')} />
              )}
              <button
                disabled={future}
                className={[
                  'relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium transition-colors',
                  future ? 'opacity-20 cursor-not-allowed text-white/30' : 'cursor-pointer',
                  selected ? 'bg-spotify-green text-black font-bold' : '',
                  !selected && inRange ? 'text-white' : '',
                  !selected && !inRange && !future ? 'hover:bg-white/10 text-white/70' : '',
                  isToday && !selected ? 'text-spotify-green ring-1 ring-spotify-green/40' : '',
                ].join(' ')}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/8">
        <p className="text-sm text-white/40">
          {!draft.start ? 'Pick a start date' :
           !draft.end   ? 'Now pick an end date' :
           `${dayCount} day${dayCount === 1 ? '' : 's'}`}
        </p>
        <button
          onClick={apply}
          disabled={!draft.start || !draft.end}
          className="px-5 py-2 bg-spotify-green text-black text-sm font-bold rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-green-400 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <div onClick={openPicker} className="cursor-pointer select-none">{trigger}</div>

      {open && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-[#111] overflow-y-auto">
          <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/8">
            <h2 className="text-lg font-bold">Select period</h2>
            <button
              onClick={() => setOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/8 text-white/60 hover:text-white transition-colors"
            >
              <X size={17} />
            </button>
          </div>
          <div className="flex-1 px-5 py-6">
            <Calendar />
          </div>
        </div>
      )}

      {open && (
        <div className="hidden sm:block absolute right-0 top-full mt-2 z-50 bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-2xl w-80 select-none">
          <Calendar />
        </div>
      )}
    </div>
  );
}
