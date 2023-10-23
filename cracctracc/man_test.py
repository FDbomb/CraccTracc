import pandas as pd

# Common modules
from common import cracclog as clog

# Submodules
from modules import manoeuvres as mano
from modules import visualiser as vis


def main():
    log = clog.init_logger(True)

    df = pd.read_pickle("output/activity_7737592803-metrics.pkl")
    df = mano.manoeuvres(log, df)
    log.debug(df[200:246])
    vis.create_plot2(log, df)
    vis.show_plots(log)

    df2 = mano.manoeuvres_analysis(log, df)
    log.debug(df2[0:60])


if __name__ == "__main__":
    main()
