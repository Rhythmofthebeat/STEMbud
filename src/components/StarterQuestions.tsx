const STARTERS = [
  { subject: 'Biology',  q: 'How does photosynthesis work?' },
  { subject: 'Physics',  q: "Explain Newton's three laws of motion" },
  { subject: 'Math',     q: 'How do I solve quadratic equations?' },
  { subject: 'Biology',  q: 'What\'s the difference between mitosis and meiosis?' },
];

interface Props {
  onSelect: (q: string) => void;
}

export default function StarterQuestions({ onSelect }: Props) {
  return (
    <div className="starters">
      {STARTERS.map(({ subject, q }) => (
        <button key={q} className="starter-btn" onClick={() => onSelect(q)}>
          <span className="starter-content">
            <span className="starter-subject">{subject}</span>
            <span className="starter-q">{q}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
