# Polo

poetry shell # to create the python venv
poetry install # to install deps specified in pyproject.toml (.lock always prioritised)
poetry run # run script (see pyproject.toml [tool.poetry.scripts]

poetry export -f requirements.txt -o requirements.txt --without-hashes # for old school pip etc.
