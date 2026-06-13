'use client';

import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { getLocalDateString } from '../lib/db';

interface HeatmapProps {
  activities: Activity[];
  userName: string;
  freezeDates?: string[];
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function HeatmapInner({ activities, userName, freezeDates = [] }: HeatmapProps) {
  const [dateRange, setDateRange] = useState<'last12' | 'thisYear' | 'prevYear'>('last12');
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

  // Generate months ending in the current month depending on the selected range filter
  const monthlyData = useMemo(() => {
    const today = new Date();
    const result = [];

    // Determine the month loop boundaries
    const monthCount = 12;
    let getYearAndMonth: (idx: number) => { year: number; monthIndex: number };

    if (dateRange === 'last12') {
      // Rolling 12-month range ending in the current month
      getYearAndMonth = (idx) => {
        const targetDate = new Date(today.getFullYear(), today.getMonth() - (11 - idx), 1);
        return {
          year: targetDate.getFullYear(),
          monthIndex: targetDate.getMonth(),
        };
      };
    } else if (dateRange === 'thisYear') {
      // Jan to Dec of the current calendar year
      getYearAndMonth = (idx) => {
        return {
          year: today.getFullYear(),
          monthIndex: idx,
        };
      };
    } else {
      // Jan to Dec of the previous calendar year
      getYearAndMonth = (idx) => {
        return {
          year: today.getFullYear() - 1,
          monthIndex: idx,
        };
      };
    }

    for (let i = 0; i < monthCount; i++) {
      const { year, monthIndex } = getYearAndMonth(i);
      const targetDate = new Date(year, monthIndex, 1);
      const monthLabel = targetDate.toLocaleString(undefined, { month: 'short' });
      const yearLabel = targetDate.getFullYear();

      // Days in this month
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

      // Weekday index of 1st of month: 0 (Sun) to 6 (Sat)
      const firstDayOfWeekday = new Date(year, monthIndex, 1).getDay();

      // Convert to Mon-Sun start offset (0 = Mon, 6 = Sun)
      const startOffset = firstDayOfWeekday === 0 ? 6 : firstDayOfWeekday - 1;

      const cells: {
        dateStr: string | null;
        dayNum: number | null;
        count: number;
        category: string | null;
        notes: string | null;
      }[] = [];

      // 1. Padding leading empty cells
      for (let j = 0; j < startOffset; j++) {
        cells.push({
          dateStr: null,
          dayNum: null,
          count: 0,
          category: null,
          notes: null,
        });
      }

      // 2. Main calendar month days
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = getLocalDateString(new Date(year, monthIndex, day));
        const dayData = activityMap.get(dateStr);
        const isFrozen = freezeDates.includes(dateStr);

        cells.push({
          dateStr,
          dayNum: day,
          count: dayData?.count || 0,
          category: isFrozen ? 'Streak Freeze' : (dayData?.category || null),
          notes: isFrozen ? 'Streak preserved using freeze token ❄️' : (dayData?.notes && dayData.notes.length > 0 ? dayData.notes.join('; ') : null),
        });
      }

      // 3. Padding trailing empty cells
      const remainder = cells.length % 7;
      if (remainder > 0) {
        const trailingEmptyCount = 7 - remainder;
        for (let j = 0; j < trailingEmptyCount; j++) {
          cells.push({
            dateStr: null,
            dayNum: null,
            count: 0,
            category: null,
            notes: null,
          });
        }
      }

      // 4. Group cells into columns of weeks (7 days each)
      const weeks: typeof cells[] = [];
      for (let j = 0; j < cells.length; j += 7) {
        weeks.push(cells.slice(j, j + 7));
      }

      result.push({
        monthLabel,
        yearLabel,
        weeks,
      });
    }

    return result;
  }, [activityMap, dateRange, freezeDates]);

  // Helper to determine the green color level or blue for freezes
  const getColorLevel = (count: number, isFreeze?: boolean) => {
    if (isFreeze) return '#38bdf8'; // Blue freeze color
    if (count === 0) return 'var(--level-0)';
    if (count === 1) return 'var(--level-1)';
    if (count <= 2) return 'var(--level-2)';
    if (count <= 4) return 'var(--level-3)';
    return 'var(--level-4)';
  };

  const handleMouseEnter = (
    e: React.MouseEvent<SVGRectElement>,
    day: { dateStr: string | null; count: number; category: string | null; notes: string | null }
  ) => {
    if (!day.dateStr) return;
    const rect = e.currentTarget.getBoundingClientRect();
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Activity Heatmap</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
            Calendar grid tracking study logs of {userName}.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Stats counts */}
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            <div>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>{totalSubmissions}</span>
              <span style={{ color: 'var(--foreground-muted)' }}> total problems</span>
            </div>
            <div>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{activeDaysCount}</span>
              <span style={{ color: 'var(--foreground-muted)' }}> active days</span>
            </div>
          </div>

          {/* Date range dropdown selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'last12' | 'thisYear' | 'prevYear')}
            className="input-field"
            style={{
              padding: '0.35rem 1.75rem 0.35rem 0.75rem',
              fontSize: '0.8rem',
              width: 'auto',
              borderRadius: 'var(--border-radius-sm)',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--glass-border)',
              color: 'var(--foreground)',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1em',
            }}
          >
            <option value="last12" style={{ background: '#0e172e' }}>Last 12 Months</option>
            <option value="thisYear" style={{ background: '#0e172e' }}>This Calendar Year</option>
            <option value="prevYear" style={{ background: '#0e172e' }}>Previous Calendar Year</option>
          </select>
        </div>
      </div>

      {/* Calendar Months Horizontal Scrollable Container */}
      <div style={{
        display: 'flex',
        gap: '1.25rem',
        marginTop: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        width: '100%',
        scrollbarWidth: 'thin',
        msOverflowStyle: 'none'
      }}>
        {monthlyData.map((month) => (
          <div
            key={`${month.monthLabel}-${month.yearLabel}`}
            style={{
              flex: '0 0 135px', // Keeps cards size identical and prevents shrinking/growing
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '0.75rem 0.5rem',
              transition: 'var(--transition-smooth)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
            }}
          >
            {/* Month Header Label */}
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.5rem' }}>
              {month.monthLabel} {month.yearLabel}
            </div>

            {/* SVG Month Calendar */}
            <svg
              viewBox="0 0 115 110"
              style={{
                width: '100%',
                height: 'auto',
                maxWidth: '115px',
                overflow: 'visible',
              }}
            >
              {/* Embedded Weekday labels */}
              {WEEKDAYS.map((day, idx) => (
                <text
                  key={day}
                  x="4"
                  y={20 + idx * 12 + 8.5}
                  fontSize="9.5"
                  fill="var(--foreground-dark)"
                  fontWeight="600"
                >
                  {day}
                </text>
              ))}

              {/* Render Weeks Columns */}
              {month.weeks.map((week, colIdx) => (
                <g key={colIdx} transform={`translate(${35 + colIdx * 13}, 0)`}>
                  {week.map((day, dayIdx) => {
                    if (day.dayNum === null) return null;
                    return (
                      <rect
                        key={dayIdx}
                        x="0"
                        y={20 + dayIdx * 12}
                        width="10"
                        height="10"
                        rx="2"
                        ry="2"
                        fill={getColorLevel(day.count, day.category === 'Streak Freeze')}
                        style={{
                          cursor: 'pointer',
                          stroke: day.count > 0 ? 'rgba(255, 255, 255, 0.05)' : 'none',
                          transition: 'fill 0.2s ease',
                        }}
                        onMouseEnter={(e) => handleMouseEnter(e, day)}
                        onMouseLeave={handleMouseLeave}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>
        ))}
      </div>

      {/* Heatmap Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--foreground-muted)', borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
        <span>* Activity is tracked in local timezone</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#38bdf8' }} />
            <span>Streak Freeze ❄️</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Less</span>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--level-0)' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--level-1)' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--level-2)' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--level-3)' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--level-4)' }} />
            <span>More</span>
          </div>
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
