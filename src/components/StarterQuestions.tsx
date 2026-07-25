const STARTERS = [
  '🌿 How does photosynthesis work?',
  '⚙️ Explain Newton\'s three laws of motion',
  '🔢 How do I solve quadratic equations?',
  '🧬 What\'s the difference between mitosis and meiosis?',
];

interface Props {
  onSelect: (q: string) => void;
}

export default function StarterQuestions({ onSelect }: Props) {
  return (
    <div className="starters">
      {STARTERS.map((q) => (
        <button
          key={q}
          className="starter-btn"
          onClick={() => onSelect(q.replace(/^[\S]+\s/, ''))} // strip emoji
        >
          {q}
        </button>
      ))}
    </div>
  );
}
