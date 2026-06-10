'use client';

import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { getLocalDateString } from '../lib/db';

interface BarGraphProps {
  activities: Activity[];
}

function BarGraphInner({ activities }: BarGraphProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);

  // Get last 14 days including today
  const last14DaysData = useMemo(() => {
    const data = [];
    const today = new Date();

    // Index activities by date
    const activityMap = new Map<string, Activity[]>();
    activities.forEach(act => {
      const existing = activityMap.get(act.date) || [];
      existing.push(act);
      activityMap.set(act.date, existing);
    });

    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayActivities = activityMap.get(dateStr) || [];
      const totalCount = dayActivities.reduce((sum, act) => sum + act.count, 0);

      data.push({
        dateStr,
        label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
        fullDateLabel: d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
        count: totalCount,
        activities: dayActivities,
      });
    }
    return data;
  }, [activities]);

  const maxVal = useMemo(() => {
    const val = Math.max(...last14DaysData.map(d => d.count), 0);
    return val === 0 ? 5 : val; // default scale
  }, [last14DaysData]);

  // Set default selected day to today (last index) if none selected
  const activeIndex = selectedDayIdx !== null ? selectedDayIdx : 13;
  const activeDay = last14DaysData[activeIndex];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>14-Day Activity Tracker</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
          Detailed daily breakdown. Click on any bar to drill down into logs.
        </p>
      </div>

      {/* Graph Area */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: '180px',
        borderBottom: '1px solid var(--glass-border)',
        paddingBottom: '8px',
        gap: '4px',
        position: 'relative'
      }}>
        {last14DaysData.map((day, idx) => {
          const heightPct = (day.count / maxVal) * 100;
          const isActive = idx === activeIndex;

          return (
            <div
              key={day.dateStr}
              onClick={() => setSelectedDayIdx(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexGrow: 1,
                cursor: 'pointer',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              {/* Bar */}
              <div
                style={{
                  width: '75%',
                  maxWidth: '32px',
                  minWidth: '12px',
                  height: `${Math.max(heightPct, day.count > 0 ? 5 : 2)}%`,
                  background: day.count > 0
                    ? (isActive
                        ? 'linear-gradient(180deg, var(--primary) 0%, #0284c7 100%)'
                        : 'linear-gradient(180deg, rgba(14, 165, 233, 0.4) 0%, rgba(16, 185, 129, 0.4) 100%)')
                    : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px 6px 0 0',
                  border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                  boxShadow: isActive && day.count > 0 ? '0 0 15px var(--primary-glow)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive && day.count > 0) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, rgba(14, 165, 233, 0.7) 0%, rgba(16, 185, 129, 0.7) 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && day.count > 0) {
                    e.currentTarget.style.background = 'linear-gradient(180deg, rgba(14, 165, 233, 0.4) 0%, rgba(16, 185, 129, 0.4) 100%)';
                  }
                }}
              >
                {/* Count badge on hover or active */}
                {day.count > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--primary)' : 'var(--foreground-muted)',
                    transition: 'var(--transition-smooth)'
                  }}>
                    {day.count}
                  </div>
                )}
              </div>

              {/* Label */}
              <div style={{
                fontSize: '0.7rem',
                color: isActive ? 'var(--primary)' : 'var(--foreground-muted)',
                fontWeight: isActive ? 700 : 400,
                marginTop: '8px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%'
              }}>
                {day.label.split(' ')[0]}
                <div style={{ fontSize: '0.65rem', color: 'var(--foreground-dark)' }}>
                  {day.label.split(' ')[1]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drill-down Detail Panel */}
      <div className="glass-panel" style={{
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '12px',
        padding: '1rem',
        animation: 'fadeIn 0.3s ease'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Logs for {activeDay.fullDateLabel}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: activeDay.count > 0 ? 'var(--success)' : 'var(--foreground-muted)' }}>
            {activeDay.count} Task{activeDay.count !== 1 ? 's' : ''} Completed
          </span>
        </div>

        {activeDay.activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem 0', color: 'var(--foreground-dark)', fontSize: '0.85rem' }}>
            No activities logged on this day.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeDay.activities.map((act) => (
              <div key={act.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.8rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(14, 165, 233, 0.15)',
                    border: '1px solid rgba(14, 165, 233, 0.2)',
                    color: 'var(--primary)',
                    fontWeight: 600
                  }}>
                    {act.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--foreground-dark)' }}>
                    Count: <strong>{act.count}</strong>
                  </span>
                </div>
                {act.notes && (
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--foreground-muted)',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--success)',
                    margin: '4px 0'
                  }}>
                    {act.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const BarGraph = React.memo(BarGraphInner);
export default BarGraph;
