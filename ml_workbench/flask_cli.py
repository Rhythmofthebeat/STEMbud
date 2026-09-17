"""Register optional ML commands without loading ML libraries on app startup."""
def register(app):
    import click

    @app.cli.command('ml', context_settings={'ignore_unknown_options': True, 'allow_extra_args': True})
    @click.argument('arguments', nargs=-1, type=click.UNPROCESSED)
    def ml(arguments):
        """Train or predict: flask ml train --output ml_workbench/runs/baseline."""
        from .__main__ import main
        main(list(arguments))
