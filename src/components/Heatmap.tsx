'use client';

import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { getLocalDateString } from '../lib/db';

interface HeatmapProps {
  activities: Activity[];
  userName: string;
}

function HeatmapInner({ activities, userName }: HeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    count: number;
    notes: string | null;
    category: string | null;
    x: number;
    y: number;
  } | null>(null);

  // Group activities by date for fast lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, { count: number; category: string; notes: string[] }>();
    activities.forEach(act => {
      const existing = map.get(act.date);
      if (existing) {
        existing.count += act.count;
        if (act.notes) existing.notes.push(act.notes);
      } else {
        map.set(act.date, {
          count: act.count,
          category: act.category,
          notes: act.notes ? [act.notes] : [],
        });
      }
    });
    return map;
  }, [activities]);

  // Generate 53 weeks of dates ending today, aligned to starts of weeks
  const gridData = useMemo(() => {
    const today = new Date();
    const resultWeeks: {
      days: { dateStr: string; dateObj: Date; count: number; category: string | null; notes: string | null }[];
      monthLabel?: string;
    }[] = [];

    // Go back 364 days (52 weeks)
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);
    
    // Roll back to the nearest Sunday
    const startDayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - startDayOfWeek);

    const currentDate = new Date(startDate);
    let currentWeek: typeof resultWeeks[0]['days'] = [];
    let previousMonthStr = '';

    while (currentDate <= today || currentWeek.length > 0) {
      const dateStr = getLocalDateString(currentDate);
      const dayData = activityMap.get(dateStr);
      
      currentWeek.push({
        dateStr,
        dateObj: new Date(currentDate),
        count: dayData?.count || 0,
        category: dayData?.category || null,
        notes: dayData?.notes && dayData.notes.length > 0 ? dayData.notes.join('; ') : null,
      });

      // If week is full (7 days) or we reached the limit
      if (currentWeek.length === 7) {
        // Determine if we should show a month label
        // We show it if the month of the first day of this week is different from previous
        const firstDayOfMonth = currentWeek[0].dateObj;
        const monthStr = firstDayOfMonth.toLocaleString(undefined, { month: 'short' });
        let monthLabel: string | undefined;

        if (monthStr !== previousMonthStr) {
          monthLabel = monthStr;
          previousMonthStr = monthStr;
        }

        resultWeeks.push({ days: currentWeek, monthLabel });
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
      
      // Stop condition safety
      if (currentDate > today && currentWeek.length === 0) {
        break;
      }
      if (resultWeeks.length > 54) {
        break; // safety break
      }
    }

    return resultWeeks;
  }, [activityMap]);

  // Helper to determine the green color level
  const getColorLevel = (count: number) => {
    if (count === 0) return 'var(--level-0)';
    if (count === 1) return 'var(--level-1)';
    if (count <= 2) return 'var(--level-2)';
    if (count <= 4) return 'var(--level-3)';
    return 'var(--level-4)';
  };

  const handleMouseEnter = (
    e: React.MouseEvent<SVGRectElement>,
    day: typeof gridData[0]['days'][0]
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Position tooltip above the hovered square relative to page
    setHoveredDay({
      dateStr: day.dateStr,
      count: day.count,
      notes: day.notes,
      category: day.category,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 10,
    });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  // Calculations for total logs
  const totalSubmissions = useMemo(() => {
    return activities.reduce((sum, a) => sum + a.count, 0);
  }, [activities]);

  const activeDaysCount = useMemo(() => {
    return activityMap.size;
  }, [activityMap]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Activity Heatmap</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
            Calendar grid tracking study logs of {userName} over the past year.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem' }}>
          <div>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>{totalSubmissions}</span>
            <span style={{ color: 'var(--foreground-muted)' }}> total problems</span>
          </div>
          <div>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{activeDaysCount}</span>
            <span style={{ color: 'var(--foreground-muted)' }}> active days</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Wrapper */}
      <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'inline-flex', gap: '8px', padding: '10px 4px 0 4px', minWidth: '780px' }}>
          {/* Weekday labels */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '84px',
            fontSize: '0.7rem',
            color: 'var(--foreground-dark)',
            paddingTop: '20px', // offset for month labels
            paddingRight: '6px'
          }}>
            <span>Sun</span>
            <span>Tue</span>
            <span>Thu</span>
            <span>Sat</span>
          </div>

          {/* SVG Heatmap */}
          <svg width="780" height="110" style={{ overflow: 'visible' }}>
            {/* Render weeks columns */}
            {gridData.map((week, weekIdx) => (
              <g key={weekIdx} transform={`translate(${weekIdx * 14}, 0)`}>
                {/* Month labels at top of column */}
                {week.monthLabel && (
                  <text
                    x="0"
                    y="12"
                    fontSize="9.5"
                    fill="var(--foreground-muted)"
                    fontWeight="500"
                  >
                    {week.monthLabel}
                  </text>
                )}

                {/* Days squares */}
                {week.days.map((day, dayIdx) => (
                  <rect
                    key={dayIdx}
                    x="0"
                    y={20 + dayIdx * 12}
                    width="10"
                    height="10"
                    rx="2"
                    ry="2"
                    fill={getColorLevel(day.count)}
                    style={{
                      cursor: 'pointer',
                      stroke: day.count > 0 ? 'rgba(255, 255, 255, 0.05)' : 'none',
                      transition: 'fill 0.2s ease',
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, day)}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--foreground-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem' }}>
        <span>* Activity is tracked in local timezone</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Less</span>
          <div style={{ width: '10px', height: '10px', rx: '2', borderRadius: '2px', background: 'var(--level-0)' }} />
          <div style={{ width: '10px', height: '10px', rx: '2', borderRadius: '2px', background: 'var(--level-1)' }} />
          <div style={{ width: '10px', height: '10px', rx: '2', borderRadius: '2px', background: 'var(--level-2)' }} />
          <div style={{ width: '10px', height: '10px', rx: '2', borderRadius: '2px', background: 'var(--level-3)' }} />
          <div style={{ width: '10px', height: '10px', rx: '2', borderRadius: '2px', background: 'var(--level-4)' }} />
          <span>More</span>
        </div>
      </div>

      {/* Floating Tooltip portal */}
      {hoveredDay && (
        <div
          className="tooltip animate-fade-in"
          style={{
            position: 'absolute',
            left: hoveredDay.x,
            top: hoveredDay.y,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {hoveredDay.count === 0 ? 'No activity' : `${hoveredDay.count} task${hoveredDay.count > 1 ? 's' : ''} completed`}
          </div>
          <div style={{ color: 'var(--foreground-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
            {new Date(hoveredDay.dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {hoveredDay.category && (
            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 500 }}>
              Tag: {hoveredDay.category}
            </div>
          )}
          {hoveredDay.notes && (
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--success)',
              marginTop: '4px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '4px',
              maxWidth: '180px',
              whiteSpace: 'normal',
              wordBreak: 'break-word'
            }}>
              &ldquo;{hoveredDay.notes}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Heatmap = React.memo(HeatmapInner);
export default Heatmap;
