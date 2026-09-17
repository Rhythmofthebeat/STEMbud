"""Small, reproducible classifiers; no dependency on hosted model APIs."""
from pathlib import Path
import json
import math
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


def load_data(path):
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    if not {'text', 'label'} <= set(frame.columns):
        raise ValueError('CSV must contain text and label columns.')
    frame = frame[['text', 'label']].copy()
    for column in frame:
        frame[column] = frame[column].str.strip()
    if frame.eq('').any().any():
        raise ValueError('Text and labels cannot be empty.')
    if len(frame) > 20000 or frame.text.str.len().max() > 10000:
        raise ValueError('Limit datasets to 20,000 rows and 10,000 characters per text.')
    # Prevent repeated examples from leaking into both train and test sets.
    frame['_key'] = frame.text.str.casefold().str.replace(r'\s+', ' ', regex=True)
    if frame.groupby('_key').label.nunique().gt(1).any():
        raise ValueError('The same text has conflicting labels.')
    frame = frame.drop_duplicates('_key').drop(columns='_key').reset_index(drop=True)
    counts = frame.label.value_counts()
    if len(counts) < 2 or counts.min() < 4:
        raise ValueError('Provide at least two labels and four unique examples per label.')
    return frame


def fit_model(backend, x, y, classes, epochs, seed):
    """Return serializable linear weights and biases from each training engine."""
    if backend == 'sklearn':
        model = LogisticRegression(max_iter=500, random_state=seed).fit(x, y)
        weights, bias = model.coef_.T, model.intercept_
        if classes == 2:
            weights = np.column_stack([np.zeros(x.shape[1]), weights[:, 0]])
            bias = np.array([0., bias[0]])
        return weights, bias
    if backend == 'pytorch':
        import torch
        torch.manual_seed(seed)
        model = torch.nn.Linear(x.shape[1], classes)
        optimizer = torch.optim.Adam(model.parameters(), lr=0.03)
        features, targets = torch.from_numpy(x), torch.from_numpy(y.astype(np.int64))
        for _ in range(epochs):
            optimizer.zero_grad()
            loss = torch.nn.functional.cross_entropy(model(features), targets)
            loss.backward()
            optimizer.step()
        return model.weight.detach().numpy().T, model.bias.detach().numpy()
    if backend == 'tensorflow':
        import tensorflow as tf
        tf.keras.utils.set_random_seed(seed)
        model = tf.keras.Sequential([tf.keras.layers.Input(shape=(x.shape[1],)), tf.keras.layers.Dense(classes)])
        optimizer = tf.keras.optimizers.Adam(learning_rate=0.03)
        features = tf.convert_to_tensor(x)
        targets = tf.convert_to_tensor(y, dtype=tf.int64)
        for _ in range(epochs):
            with tf.GradientTape() as tape:
                loss = tf.reduce_mean(tf.keras.losses.sparse_categorical_crossentropy(targets, model(features), from_logits=True))
            optimizer.apply_gradients(zip(tape.gradient(loss, model.trainable_variables), model.trainable_variables))
        return tuple(model.layers[-1].get_weights())
    raise ValueError('Backend must be sklearn, pytorch or tensorflow.')


def train(csv_path, output, backend='sklearn', epochs=60, seed=42):
    if not 1 <= epochs <= 1000:
        raise ValueError('Epochs must be between 1 and 1,000.')
    frame = load_data(csv_path)
    encoder = LabelEncoder().fit(frame.label)
    labels = encoder.transform(frame.label)
    ntest = max(len(encoder.classes_), math.ceil(len(frame) * .25))
    train_ids, test_ids = train_test_split(np.arange(len(frame)), test_size=ntest, stratify=labels, random_state=seed)
    vectorizer = TfidfVectorizer(max_features=2048, ngram_range=(1, 2), sublinear_tf=True)
    # Fit vocabulary and IDF only on training examples.
    xtrain = vectorizer.fit_transform(frame.text.iloc[train_ids]).toarray().astype(np.float32)
    xtest = vectorizer.transform(frame.text.iloc[test_ids]).toarray().astype(np.float32)
    weights, bias = fit_model(backend, xtrain, labels[train_ids], len(encoder.classes_), epochs, seed)
    predicted = (xtest @ weights + bias).argmax(axis=1)
    majority = np.bincount(labels[train_ids]).argmax()
    report = {
        'backend': backend, 'seed': seed, 'epochs': epochs if backend != 'sklearn' else None,
        'rows': len(frame), 'train_rows': len(train_ids), 'test_rows': len(test_ids),
        'labels': encoder.classes_.tolist(), 'label_counts': frame.label.value_counts().to_dict(),
        'mean_text_characters': float(frame.text.str.len().mean()),
        'accuracy': float(accuracy_score(labels[test_ids], predicted)),
        'macro_f1': float(f1_score(labels[test_ids], predicted, average='macro', zero_division=0)),
        'majority_baseline_accuracy': float(np.mean(labels[test_ids] == majority)),
        'confusion_matrix': confusion_matrix(labels[test_ids], predicted, labels=np.arange(len(encoder.classes_))).tolist(),
    }
    destination = Path(output)
    destination.mkdir(parents=True, exist_ok=True)
    # Portable inference artifact: no pickle or framework needed for loading weights.
    np.savez(destination / 'weights.npz', weights=weights, bias=bias, idf=vectorizer.idf_)
    (destination / 'vocabulary.json').write_text(json.dumps({'vocabulary': {term: int(index) for term, index in vectorizer.vocabulary_.items()}, 'labels': encoder.classes_.tolist()}, ensure_ascii=False))
    (destination / 'report.json').write_text(json.dumps(report, indent=2))
    pd.DataFrame({'row': test_ids, 'expected': encoder.inverse_transform(labels[test_ids]), 'predicted': encoder.inverse_transform(predicted)}).to_csv(destination / 'evaluation.csv', index=False)
    return report


def predict(directory, text):
    if not text.strip() or len(text) > 10000:
        raise ValueError('Enter between 1 and 10,000 characters.')
    root = Path(directory)
    metadata = json.loads((root / 'vocabulary.json').read_text())
    with np.load(root / 'weights.npz', allow_pickle=False) as data:
        vectorizer = TfidfVectorizer(vocabulary=metadata['vocabulary'], ngram_range=(1, 2), sublinear_tf=True)
        vectorizer.idf_ = data['idf']
        vector = vectorizer.transform([text])
        if vector.nnz == 0:
            return {'label': None, 'reason': 'No known vocabulary; provide an in-domain example.'}
        logits = np.asarray(vector @ data['weights'] + data['bias'])[0]
    scores = np.exp(logits - logits.max())
    scores /= scores.sum()
    return {'label': metadata['labels'][int(scores.argmax())],
            'scores': dict(zip(metadata['labels'], scores.tolist())),
            'note': 'Scores are uncalibrated model outputs, not validated confidence.'}
