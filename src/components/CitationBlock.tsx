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
        📚 {citations.length} source{citations.length !== 1 ? 's' : ''} {open ? '▲' : '▼'}
      </button>
      {open &&
        citations.map((c, i) => (
          <div key={i} className="citation-item">
            <div className="citation-file">📄 {c.filename}</div>
            {c.quote && <div className="citation-quote">"{c.quote}"</div>}
          </div>
        ))}
    </div>
  );
}
