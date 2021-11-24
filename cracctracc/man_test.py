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
    vis.plot2(df)


if __name__ == "__main__":
    main()
