import os
import pathlib

import click

# Common modules
from cracctracc import __version__
from cracctracc.common import cracclog as clog

# Submodules
from cracctracc.modules import manoeuvres as mano
from cracctracc.modules import parser
from cracctracc.modules import visualiser as vis
from cracctracc.modules import wind


# Setup click
@click.command()
@click.argument("gpx_track_file", type=click.File("r"))  # Add arg for ingress GPX track file
@click.option("--debug", "-d", help="Turn debug logging on", is_flag=True, default=False)  # Debug option switch
@click.option("--output-csv", "-o", help="Save CSV ouptut", is_flag=True, default=False)  # CSV output
@click.option("--output-pkl", "-p", help="Save PKL ouptut", is_flag=True, default=False)  # PKL output
def main(gpx_track_file, debug, output_csv, output_pkl):
    """CraccTracc is a sailing VMG analysis tool that uses the GPX track generated by GNSS enabled smartwatches to
        generate VMG plots for manual analysis.

    GPX_TRACK_FILE is the path to the input GPX track file
    """
    # Initialise logging
    log = clog.init_logger(debug)

    log.info(f"CraccTracc {__version__}\n")
    log.debug("Debug enabled")

    # set the source file to analyse
    source = gpx_track_file.name
    source_base, source_ext = os.path.splitext(source)
    source_head, source_tail = os.path.split(source_base)
    log.debug(f"Using {source} as input data")

    # save df from GPX or VKX data
    df = parser.parse(log, source, source_ext)

    # add twd to df
    df = wind.add_twd(log, df, twd=0)

    df_man = mano.manoeuvres(log, df)

    # Save metrics for external analysis
    if output_csv or output_pkl:
        output_head = "output"
        output_tail = source_tail + "-metrics"
        pathlib.Path(output_head).mkdir(parents=True, exist_ok=True)  # Check if output dir exists and create if not
        if output_csv:
            output_ext = "csv"
            df.to_csv(f"{output_head}/{output_tail}.{output_ext}")
            log.info(f"Exported metrics to {output_head}/{output_tail}.{output_ext}")
        if output_pkl:
            output_ext = "pkl"
            df.to_pickle(f"{output_head}/{output_tail}.{output_ext}")
            log.info(f"Exported metrics to {output_head}/{output_tail}.{output_ext}")

    vis.plot(log, df_man, "twd")
    vis.dashboard(log, df)

    vis.show_plots(log)

    input("Press Enter to exit...")
    vis.close_plots(log)


if __name__ == "__main__":
    main()
