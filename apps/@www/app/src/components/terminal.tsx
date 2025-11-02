import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import * as styles from './terminal.css';

export interface TerminalLine {
  text: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'prompt' | 'output';
  timestamp?: number;
}

interface TerminalProps {
  lines: TerminalLine[];
  isActive?: boolean;
  onCommand?: (command: string) => void;
}

export function Terminal({ lines, isActive = false, onCommand }: TerminalProps) {
  const [input, setInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new lines are added
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    // Auto-focus input when terminal becomes active
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    // Update cursor position when input changes
    if (measureRef.current && inputRef.current) {
      const text = input.substring(0, inputRef.current.selectionStart || 0);
      measureRef.current.textContent = text;
      setCursorPosition(measureRef.current.offsetWidth);
    }
  }, [input]);

  const updateCursorPosition = () => {
    if (measureRef.current && inputRef.current) {
      const text = input.substring(0, inputRef.current.selectionStart || 0);
      measureRef.current.textContent = text;
      setCursorPosition(measureRef.current.offsetWidth);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onCommand?.(input.trim());
      setInput('');
    } else {
      // Update cursor position on key press
      setTimeout(updateCursorPosition, 0);
    }
  };

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const handleClick = () => {
    setTimeout(updateCursorPosition, 0);
  };

  return (
    <div className={styles.terminal} onClick={handleTerminalClick}>
      <div className={styles.body}>
        {lines.map((line, index) => (
          <div key={index} className={styles.line}>
            {line.type === 'prompt' ? (
              <>
                <span className={styles.prompt}>&gt;</span>{' '}
                <span className={styles.promptText}>{line.text}</span>
              </>
            ) : (
              <span
                className={
                  line.type === 'info'
                    ? styles.info
                    : line.type === 'success'
                      ? styles.success
                      : line.type === 'warning'
                        ? styles.warning
                        : line.type === 'error'
                          ? styles.error
                          : styles.output
                }
              >
                {line.text}
              </span>
            )}
          </div>
        ))}
        <div className={styles.line}>
          <span className={styles.prompt}>&gt;</span>{' '}
          <div className={styles.inputWrapper}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              className={styles.input}
              disabled={!isActive}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
            />
            <span
              ref={measureRef}
              style={{
                position: 'absolute',
                visibility: 'hidden',
                whiteSpace: 'pre',
                fontFamily: 'inherit',
                fontSize: 'inherit',
              }}
            />
            <div className={styles.cursor} style={{ left: `${cursorPosition}px` }} />
          </div>
        </div>
        <div ref={endRef} />
      </div>
    </div>
  );
}
