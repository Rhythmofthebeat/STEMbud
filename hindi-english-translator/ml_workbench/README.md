# Boli ML workbench

Classify translated English transcripts by conversation topic. This is an optional local training and prediction extension, not an automatic change to live application decisions. The bundled 18-row CSV is synthetic educational data; its scores do not demonstrate real-world accuracy.

## Libraries and working features

- **pandas** loads labeled CSV files, checks empty/conflicting rows, deduplicates text and exports evaluation tables.
- **NumPy** manages feature arrays, stores portable weights, computes prediction scores and the majority baseline.
- **scikit-learn** creates TF-IDF features, splits data with stratification, trains logistic regression and calculates accuracy, macro F1 and confusion matrices.
- **PyTorch** trains a linear text classifier with autograd, cross-entropy loss and Adam.
- **TensorFlow/Keras** trains an equivalent classifier with GradientTape, cross-entropy loss and Adam.

These are alternative model trainers for comparison; all use the same training/test split. No hosted AI key is needed. Training artifacts can be loaded for prediction without importing PyTorch or TensorFlow.

## Setup and run

From this project's root, create a separate Python 3.11 environment for ML experiments:

```bash
python3.11 -m venv ml_workbench/.venv
source ml_workbench/.venv/bin/activate
python -m pip install -r ml_workbench/requirements.txt
python -m ml_workbench train --backend sklearn --output ml_workbench/runs/sklearn
```

For either deep-learning backend, install its requirements and run:

```bash
python -m pip install -r ml_workbench/requirements-pytorch.txt
python -m ml_workbench train --backend pytorch --output ml_workbench/runs/pytorch
python -m pip install -r ml_workbench/requirements-tensorflow.txt
python -m ml_workbench train --backend tensorflow --output ml_workbench/runs/tensorflow
python -m ml_workbench predict --model ml_workbench/runs/sklearn --text "travel train station ticket"
```

Use `--csv path/to/labeled.csv` with your own `text,label` columns. Supply at least four distinct examples per label and at least two labels. Use sufficiently large, representative, permitted datasets before relying on results. No customer records are read automatically. Raw input text is not copied into reports, but learned vocabulary can retain input terms, so keep model artifacts private if your data is private.

Each output directory contains `weights.npz`, `vocabulary.json`, `report.json`, and `evaluation.csv`. Use a different directory for each run; reusing a directory replaces those artifacts. The model is fitted only on the training split; exact normalized duplicates are removed before splitting. Related passages from one document can still leak across splits: use independently sourced examples for meaningful evaluation. The report contains held-out accuracy, macro F1, confusion matrix, label counts and a majority-class baseline. Prediction scores are uncalibrated. No-vocabulary inputs abstain.

## Application integration

Python callers can use `from ml_workbench.core import predict` then `predict(model_directory, text)` to obtain a category. The Flask projects also register `flask --app app ml train ...` and `flask --app app ml predict ...` when using an environment with their existing app dependencies. STEMMY exposes `npm run ml:train -- --output ml_workbench/runs/sklearn` and `npm run ml:predict -- --model ml_workbench/runs/sklearn --text "your question"` with the ML environment activated. Boli's workbench categorizes translated English text supplied through the same Python/CLI API.

This extension does not run models on every web request or train on users' submissions. It provides working project-local training, evaluation and reusable prediction. Evaluate on real held-out data before wiring predictions into a user-facing workflow.

## Checks

```bash
python -m unittest discover -s ml_workbench/tests -v
```

References: [scikit-learn leakage guidance](https://scikit-learn.org/stable/common_pitfalls.html), [PyTorch training](https://docs.pytorch.org/tutorials/beginner/basics/optimization_tutorial.html), [TensorFlow cross entropy](https://www.tensorflow.org/api_docs/python/tf/keras/losses/sparse_categorical_crossentropy).
