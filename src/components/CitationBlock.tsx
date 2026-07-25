import { useState } from 'react';
import type { Citation } from '../types';

interface Props {
  citations: Citation[];
}

export default function CitationBlock({ citations }: Props) {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;

  return (
    <div className="citations">
      <button className="citation-toggle" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="12" height="12">
          <path d="M3.5 4.5A1.5 1.5 0 0 1 5 3h5v14H5a1.5 1.5 0 0 1-1.5-1.5v-11ZM16.5 4.5A1.5 1.5 0 0 0 15 3h-5v14h5a1.5 1.5 0 0 0 1.5-1.5v-11Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        </svg>
        {citations.length} source{citations.length !== 1 ? 's' : ''}
        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="10" height="10" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open &&
        citations.map((c, i) => (
          <div key={i} className="citation-item">
            <div className="citation-file">
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="11" height="11">
                <path d="M6 2.5h5.5L15 6v11.5H6V2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M11.5 2.5V6H15" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              </svg>
              {c.filename}
            </div>
            {c.quote && <div className="citation-quote">"{c.quote}"</div>}
          </div>
        ))}
    </div>
  );
}
