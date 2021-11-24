import importlib.metadata
import os
import pathlib
import click

# Common modules
from common import cracclog as clog

# Submodules
from modules import gpx_parser as gpx
from modules import visualiser as vis
from modules import manoeuvres as mano

__version__ = importlib.metadata.version("cracctracc")

# Setup click
@click.command()
@click.argument("gpx_track_file", type=click.File("r"))  # Add arg for ingress GPX track file
@click.option("--debug", "-d", help="Turn debug logging on", is_flag=True, default=False)  # Debug option switch
@click.option("--output-csv", "-o", help="Save CSV ouptut", is_flag=True, default=False)  # CSV output
@click.option("--output-pkl", "-p", help="Save PKL ouptut", is_flag=True, default=False)  # PKL output
def main(gpx_track_file, debug, output_csv, output_pkl):
    """CraccTracc is a sailing VMG analysis tool that uses the GPX track generated by GNSS enabled smartwatches to generate VMG plots for manual analysis.

    GPX_TRACK_FILE is the path to the input GPX track file
    """
    # Initialise logging
    log = clog.init_logger(debug)

    log.info("CraccTracc {}\n".format(__version__))
    log.debug("Debug enabled")

    # set the source file to analyse
    source = gpx_track_file.name
    source_base, source_ext = os.path.splitext(source)
    source_head, source_tail = os.path.split(source_base)
    log.debug("Using {} as input data".format(source))

    # save df from GPX data
    df = gpx.create_df(log, source)

    # add speed
    df = gpx.add_speed(log, df)

    # add true wind angle
    df = gpx.add_twa(log, df, 150)  # TWA set statically here as arg#3

    df2 = df
    df2 = mano.manoeuvres(log, df2)

    # Save metrics for external analysis
    if output_csv or output_pkl:
        output_head = "output"
        output_tail = source_tail + "-metrics"
        pathlib.Path(output_head).mkdir(parents=True, exist_ok=True)  # Check if output dir exists and create if not
        if output_csv:
            output_ext = "csv"
            df.to_csv("{}/{}.{}".format(output_head, output_tail, output_ext))
            log.info("Exported metrics to {}/{}.{}".format(output_head, output_tail, output_ext))
        if output_pkl:
            output_ext = "pkl"
            df.to_pickle("{}/{}.{}".format(output_head, output_tail, output_ext))
            log.info("Exported metrics to {}/{}.{}".format(output_head, output_tail, output_ext))

    vis.create_plot(log, df)
    vis.create_plot3(log, df2)

    vis.show_plots(log)

    input("Press Enter to exit...")
    vis.close_plots(log)
