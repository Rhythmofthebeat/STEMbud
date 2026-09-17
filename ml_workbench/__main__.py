import argparse
import json
from pathlib import Path


def main(argv=None):
    parser = argparse.ArgumentParser(description='Train and evaluate project-specific text classifiers locally.')
    commands = parser.add_subparsers(dest='command', required=True)
    trainer = commands.add_parser('train')
    trainer.add_argument('--csv', default=str(Path(__file__).with_name('examples.csv')))
    trainer.add_argument('--output', required=True, help='Use a separate directory for each experiment.')
    trainer.add_argument('--backend', choices=['sklearn', 'pytorch', 'tensorflow'], default='sklearn')
    trainer.add_argument('--epochs', type=int, default=60)
    predictor = commands.add_parser('predict')
    predictor.add_argument('--model', required=True)
    predictor.add_argument('--text', required=True)
    args = parser.parse_args(argv)
    try:
        from .core import train, predict
        result = train(args.csv, args.output, args.backend, args.epochs) if args.command == 'train' else predict(args.model, args.text)
    except (ValueError, OSError, ImportError) as exc:
        parser.exit(2, f'Error: {exc}\n')
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
