# CraccTracc

CraccTracc is a sailing VMG analysis tool developed for use with GPX tracks generated by GNSS enabled smartwatches (and possibly other devices). CraccTracc generates polar VMG plots for manual analysis.

## Getting Started

This project requires the latest version of [Poetry](https://python-poetry.org/) to be installed on your system. You can confirm a successful installation by running `poetry --version`.

The following commands are useful to get up and running:

```shell
$ poetry shell # to create or activate the Python virtual environment (you can run 'which python' before and after to confirm)
$ poetry install # to install dependencies specified in pyproject.toml (.lock is always prioritised)
$ poetry run [script] # executes a script defined in the [tool.poetry.scripts] section of pyproject.toml (or if [script] is left blank the default run script will execute)
```

To run CraccTracc in CLI mode use the following command:

```shell
$ poetry run python3 cracctracc --debug data/activity_7737592803.gpx
```

CraccTracc can export CSV metrics using the `-o` flag, or PKL metrics using the `-p` flag. All files will be exported to `./output/`

To view all CraccTracc CLI options:

```shell
$ poetry run python3 cracctracc --help
```

## Code Formating
This project uses [Black](https://github.com/psf/black/) for code formatting. Configuration is in the `[tool.black]` section of `pyproject.toml`. Ideally the editor in your development environment would run Black upon save of *.py filetypes.

CraccTracc follows PEP 8 guidelines, however maximum line length is increased to 120.

### pdb One-Liner
At times it may be useful to drop the standard pdb one-liner into code. To prevent Black formatting this single line, add the `# fmt:skip` directive (see [#790](https://github.com/psf/black/issues/790). The copy-paste one liner is shown below for reference:

```shell
import pdb; pdb.set_trace()  # fmt:skip
```

## More Useful Poetry Commands

```shell
$ poetry update # similar to poetry install, however version numbers in .lock are not respected. If newer versions exist and are valid for the project, they will be installed and .lock will be updated accordingly
$ poetry add [package-name] # adds a dependency to pyproject.toml. Package is installed immediately
$ poetry remove [package-name] # removes a dependency from pyproject.toml and uninstalls package immediately
$ poetry config --list # returns the current environment configuration variables
$ poetry check # checks the pyproject.toml file for errors
$ poetry show # displays a breakdown of all packages installed to the project (including dependencies of dependencies)
```

#### Exporting requirements.txt for use with older Python package management solutions

```shell
poetry export -f requirements.txt -o requirements.txt --without-hashes # for old school pip etc.
```
