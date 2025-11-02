import { useEffect, useRef } from 'react';
import * as styles from './terminal.css';

export interface TerminalLine {
  text: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'prompt' | 'output';
  timestamp?: number;
}

interface TerminalProps {
  lines: TerminalLine[];
  isActive?: boolean;
}

export function Terminal({ lines, isActive = false }: TerminalProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new lines are added
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className={styles.terminal}>
      <div className={styles.body}>
        {lines.length === 0 && (
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            <span className={styles.cursor}>{isActive ? '▊' : ''}</span>
          </div>
        )}
        {lines.map((line, index) => (
          <div key={index} className={styles.line}>
            {line.type === 'prompt' ? (
              <>
                <span className={styles.prompt}>$</span>{' '}
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
        {isActive && lines.length > 0 && (
          <div className={styles.line}>
            <span className={styles.prompt}>$</span>
            <span className={styles.cursor}>▊</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
