# import pandas as pd

# Common modules
from cracctracc.common import cracclog as clog

# Submodules
from cracctracc.modules import manoeuvres as mano
from cracctracc.modules import parser, visualiser, wind


def main():
    log = clog.init_logger(True)

    # test parsing, manoeuvers, and manoeuvers analysis on gpx data
    # gpx = parser.parse(log, "data/activity_7737592803.gpx", ".gpx", twd=150, race_start=1635557400000)
    # gp = 200
    # print(gpx.loc[gp : gp + 50])
    # gpx = mano.manoeuvres(log, gpx)
    # gpx_mano = mano.manoeuvres_analysis(log, gpx)
    # print(len(gpx_mano))
    # print(gpx_mano[0:50])

    # test parsing, manoeuvers, and manoeuvers analysis on vkx data
    # vkx = parser.parse(log, "data/Sutech-Atlas2 10-21-2023.vkx", ".vkx", twd=34, race_end=1697862585000)
    # vkx race end time of 1697863367232 is wrong so found this race end time from the 16s website, vkx start is right

    vkx = parser.parse(log, "data/Sutech-Atlas2 10-28-2023.vkx", ".vkx", race_end=1698473822000)
    vkx = wind.add_twd(log, vkx, twd=60)
    # again manually found this race end time from the 16s website, start time is in the vkx file
    vkx = mano.manoeuvres(log, vkx)
    # vk = 29900
    # print(vkx.loc[vk : vk + 50])
    # vkx_mano = mano.manoeuvres_analysis(log, vkx)
    # print(len(vkx_mano))
    # vkk = 150
    # print(vkx_mano[0:50])
    # print(vkx_mano[vkk - 25 : vkk + 25])

    # test visualiser
    visualiser.true_wind(log, vkx)
    visualiser.show_plots(log)


if __name__ == "__main__":
    main()
