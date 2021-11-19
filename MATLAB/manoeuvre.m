% Manoeuvre finder
%
% <Description>
%
% Author: James Lawira-Fernandez
% Date: 19-Nov-2021

%% SETUP
clear;
clf; % Clear figures

format compact;
format long;


%% VARIABLES
load('data/activity7737592803metrics.mat') % SE course, 10-20knts
% Heading - N 0deg, E 90deg, W 270deg
% For SE course, upwind is approx 135deg. So typical tacks upwind are
% 135deg +/- 90deg = 45deg (starboard tack); 225deg (port tack)
% Convention from geographiclib is azimuth is measured clockwise from N
% 0deg, with E 90deg, W -90deg

start_record = 300;
end_record = 1800;

trueWindHeading = 150;

%% Processing

% Calculate trueHeading from geographiclib azimuth calculations (different
% convention)
activity.trueHeading = activity.heading;
for count = 1:size(activity,1)
    if (activity.trueHeading(count) < 0)
        activity.trueHeading(count) = 360 - abs(activity.trueHeading(count));
    end
end

% Compute the 6 point trailing moving mean to smooth heading
% This really needs to be time based as opposed to current index based
activity.trueHeadSmooth = movmean(activity.trueHeading', [5 0])';

% Compute the 6 point trailing moving mean to smooth m/s
activity.msSmooth = movmean(activity.ms', [5 0])';


% Calculate relative heading to TWD
activity.relativeHeading = activity.trueHeadSmooth - trueWindHeading;


%% Manoeuvre List
% Gybes
gybe = [1495,
    1630,
    1788];

% Tacks
tack = [344,
    387];

%% Plotting
% Up until first bear away approx 1200 records

fprintf('Start time (UTC): %s\nEnd time (UTC): %s\n', activity.time(start_record), activity.time(end_record))

figure(1);
plot(activity.lon(start_record:end_record),activity.lat(start_record:end_record));
grid on;

figure(2);
plot(activity.time(start_record:end_record),activity.trueHeadSmooth(start_record:end_record));
grid on;

figure(3);
subplot(2,1,1);
plot(activity.time(start_record:end_record),activity.relativeHeading(start_record:end_record),'cyan','LineWidth',2);
grid on; grid minor;
title('Relative Heading (degrees from TWD, MA(5,0) )');
for count = 1:size(tack,1)
    xline(activity.time(tack(count)),'--b');
end
for count = 1:size(gybe,1)
    xline(activity.time(gybe(count)),'--r');
end
subplot(2,1,2);
plot(activity.time(start_record:end_record),activity.msSmooth(start_record:end_record),'g','LineWidth',2);
title('SOG (m/s, MA(5,0) )');
for count = 1:size(tack,1)
    xline(activity.time(tack(count)),'--b');
end
for count = 1:size(gybe,1)
    xline(activity.time(gybe(count)),'--r');
end
grid on; grid minor;