# import pandas as pd

# Common modules
from cracctracc.common import cracclog as clog

# Submodules
from cracctracc.modules import manoeuvres as mano
from cracctracc.modules import parser


def main():
    log = clog.init_logger(True)

    # test parsing, manoeuvers, and manoeuvers analysis on gpx data
    # gpx = parser.parse(log, "data/activity_7737592803.gpx", ".gpx", race_start=1635557400000)
    # gp = 200
    # print(gpx.loc[gp : gp + 50])
    # gpx = mano.manoeuvres(log, gpx)
    # gpx_mano = mano.manoeuvres_analysis(log, gpx)
    # print(len(gpx_mano))
    # print(gpx_mano[0:50])

    # test parsing, manoeuvers, and manoeuvers analysis on vkx data
    vkx = parser.parse(log, "data/Sutech-Atlas2 10-21-2023.vkx", ".vkx", race_end=1697862585000)
    # here we have manually found this race end time from the 16s website
    # extracted race end time is 1697863367232
    vkx = mano.manoeuvres(log, vkx)
    # vk = 29900
    # print(vkx.loc[vk : vk + 50])
    vkx_mano = mano.manoeuvres_analysis(log, vkx)
    print(len(vkx_mano))
    print(vkx_mano[0:50])
    print(vkx_mano[50:100])


if __name__ == "__main__":
    main()
