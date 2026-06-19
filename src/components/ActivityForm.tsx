'use client';

import React, { useState, useRef, useCallback } from 'react';
import { getLocalDateString, uploadWorkImage } from '../lib/db';

interface ActivityFormProps {
  userId: string;
  userName: string;
  onLogActivity: (
    date: string,
    count: number,
    category: string,
    notes: string | null,
    imageUrl: string | null
  ) => Promise<void>;
}

const CATEGORIES = [
  'Coding Practice',
  'DSA Practice',
  'Web Development',
  'UI/UX Design',
  'Technical Reading',
  'Database SQL',
  'Other',
];

function ActivityFormInner({ userId, userName, onLogActivity }: ActivityFormProps) {
  const todayStr = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);

  const [date, setDate] = useState(todayStr);
  const [count, setCount] = useState(1);
  const [category, setCategory] = useState('DSA Practice');
  const [customCategory, setCustomCategory] = useState('');
  const [notes, setNotes] = useState('');
  
  // File Upload States
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validation state
  const isCountValid = count > 0;
  const isNotesValid = notes.trim().length > 0;
  const isCategoryValid = category !== 'Other' || customCategory.trim().length > 0;
  const isFileValid = count <= 1 || file !== null;
  const isFormValid = isCountValid && isNotesValid && isCategoryValid && isFileValid;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFile = e.target.files?.[0] || null;

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const isValid = allowedExts.includes(fileExt || '') || allowedTypes.includes(selectedFile.type);
      
      if (!isValid) {
        setError('Only JPG, PNG, WEBP, or GIF files are allowed');
        setFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (selectedFile.size > 2 * 1024 * 1024) { // 2MB limit
        setError('Image file must be under 2MB');
        setFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setFilePreview(null);
    }
  }, []);

  const handleClearFile = useCallback(() => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Date validation: must be today or yesterday
    if (date !== todayStr && date !== yesterdayStr) {
      setError('You can only log activity for today or yesterday.');
      return;
    }

    // Strict validation
    if (count < 1) {
      setError('Problem count must be at least 1');
      return;
    }

    if (!notes.trim()) {
      setError('Please describe what you worked on');
      return;
    }

    const activeCategory = category === 'Other' ? customCategory.trim() : category;
    if (category === 'Other' && !activeCategory) {
      setError('Please specify a custom category');
      return;
    }

    if (count > 1 && !file) {
      setError('Please upload a screenshot when submitting more than 1 problem.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrl: string | null = null;
      if (file) {
        uploadedUrl = await uploadWorkImage(file, userId);
      }

      await onLogActivity(
        date,
        count,
        activeCategory,
        notes.trim(),
        uploadedUrl
      );
      
      setSuccess(true);
      setNotes('');
      setCount(1);
      handleClearFile();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to log activity. Please try again.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Log Progress for {userName}</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)' }}>
          Record your daily coding, study tasks, and milestones.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Date Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
            Date of Activity
          </label>
          <input
            type="date"
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            min={yesterdayStr}
            max={todayStr}
          />
        </div>

        <div className="form-row-flex">
          <div className="form-col-30">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
              Count <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="number"
              className="input-field"
              min="1"
              max="99"
              value={count}
              onChange={(e) => setCount(Math.max(0, parseInt(e.target.value) || 0))}
              required
              style={{
                borderColor: count < 1 && count !== 0 ? 'var(--danger)' : undefined,
              }}
            />
            {count < 1 && (
              <span style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '2px', display: 'block' }}>
                Must be at least 1
              </span>
            )}
          </div>

          <div className="form-col-70">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
              Activity Category
            </label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} style={{ background: '#0e172e' }}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Category Input if 'Other' selected */}
        {category === 'Other' && (
          <div className="animate-fade-in">
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
              Specify Category Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="E.g., System Design"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              maxLength={40}
              required
            />
          </div>
        )}

        {/* Notes details - REQUIRED */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
            Activity Details / Notes <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            className="input-field"
            placeholder="Describe what you worked on today..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={200}
            required
            style={{
              resize: 'vertical',
              minHeight: '60px',
              borderColor: notes.length > 0 && !notes.trim() ? 'var(--danger)' : undefined,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
            <span style={{ fontSize: '0.7rem', color: !notes.trim() ? 'var(--danger)' : 'var(--foreground-dark)' }}>
              {!notes.trim() ? 'Required: describe your activity' : ''}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--foreground-dark)' }}>
              {notes.length}/200
            </span>
          </div>
        </div>

        {/* Image Submission Field */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.35rem' }}>
            Work Screenshot (JPG, PNG, WEBP, GIF, {count > 1 ? <span style={{ color: 'var(--danger)' }}>required</span> : 'optional'})
          </label>
          <div style={{ fontSize: '0.75rem', color: count > 1 ? 'var(--danger)' : 'var(--foreground-dark)', marginBottom: '0.5rem' }}>
            Required when problem count is greater than 1.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choose Image File
            </button>
            {file && (
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                {file.name}
              </span>
            )}
          </div>

          {/* Upload Thumbnail Preview */}
          {filePreview && (
            <div className="animate-fade-in" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '6px', borderRadius: '8px', width: 'fit-content', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filePreview}
                alt="Upload preview"
                style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                type="button"
                onClick={handleClearFile}
                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Submit Status Alerts */}
        {error && (
          <div style={{ fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Activity and work logged! Heatmap updated.
          </div>
        )}

        {/* Button - disabled unless form is valid */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || !isFormValid}
          style={{
            width: '100%',
            marginTop: '0.5rem',
            opacity: isFormValid ? 1 : 0.5,
            cursor: isFormValid ? 'pointer' : 'not-allowed',
          }}
        >
          {isSubmitting ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="spinner" style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Uploading & Logging...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Log Activity & Submit Work</span>
            </div>
          )}
        </button>
      </form>
    </div>
  );
}

const ActivityForm = React.memo(ActivityFormInner);
export default ActivityForm;
