const STARTERS = [
  { subject: 'Biology', icon: '🧬', q: 'How does photosynthesis work?' },
  { subject: 'Physics', icon: '⚡', q: "Explain Newton's three laws of motion" },
  { subject: 'Math', icon: '∑', q: 'How do I solve quadratic equations?' },
  { subject: 'Biology', icon: '🔬', q: 'What is the difference between mitosis and meiosis?' },
];

interface Props {
  onSelect: (q: string) => void;
}

export default function StarterQuestions({ onSelect }: Props) {
  return (
    <div className="starters">
      {STARTERS.map(({ subject, icon, q }) => (
        <button key={q} className="starter-btn" onClick={() => onSelect(q)}>
          <span className="starter-icon" aria-hidden="true">{icon}</span>
          <span className="starter-content">
            <span className="starter-subject">{subject}</span>
            <span className="starter-q">{q}</span>
          </span>
          <svg className="starter-arrow" viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
            <path d="M4 10h11M11 6l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ))}
    </div>
  );
}
