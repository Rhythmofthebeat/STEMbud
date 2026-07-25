const STARTERS = [
  { icon: '🌿', subject: 'Biology',  q: 'How does photosynthesis work?' },
  { icon: '⚙️', subject: 'Physics',  q: "Explain Newton's three laws of motion" },
  { icon: '📐', subject: 'Math',     q: 'How do I solve quadratic equations?' },
  { icon: '🧬', subject: 'Biology',  q: 'What\'s the difference between mitosis and meiosis?' },
];

interface Props {
  onSelect: (q: string) => void;
}

export default function StarterQuestions({ onSelect }: Props) {
  return (
    <div className="starters">
      {STARTERS.map(({ icon, subject, q }) => (
        <button key={q} className="starter-btn" onClick={() => onSelect(q)}>
          <span className="starter-icon">{icon}</span>
          <span className="starter-content">
            <span className="starter-subject">{subject}</span>
            <span className="starter-q">{q}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
