# interactiveGoProDashboardTool
Command line helper for [time4tea/gopro-dashboard-overlay](https://github.com/time4tea/gopro-dashboard-overlay)
## Prerequisites
Make sure you've these things installed:
- python3
- pip3
- ffmpeg
- node v18

## Installation
* Clone this project to your computer
* run ```chmod +x install.sh```
* run ```sh install.sh``
*

## Usage
Make sure you've a video directory containing your gopro files, a layout xml file from ``` time4tea/gopro-dashboard-overlay```,
and a gpx file.
The run ```node index.js```. Answer the questions it asks you and it will generate a video with the overlay.

## Notice
I wrote this script because i did not like to edit the same command over and over again. I did not test it using automated
tests etc. Use at your own risk. Just study the index.js script first when in doubt.
