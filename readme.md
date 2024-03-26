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
* run ```sh install.sh```

Now, depending on if you are on windows, mac or linux you need to "activate" the virtual environment. Have a look at the [python manual](https://docs.python.org/3/library/venv.html#how-venvs-work) on how to do that. For example on a mac bash or zsh shells, you need to run this command:
```source venv/bin/activate```. On windows ```venv\Scripts\activate.bat```

## Usage
Make sure you've a video directory containing your gopro files, a layout xml file from ``` time4tea/gopro-dashboard-overlay```,
and a gpx file.
Then run ```node index.js```. Answer the questions it asks you and it will generate a video with the overlay.

## Notice
I wrote this script because i did not like to edit the same command over and over again. I did not test it using automated
tests etc. Use at your own risk. Just study the index.js script first when in doubt.

## Tips
This command line does not provide an easy interface to all of time4tea tools. Refer to [https://github.com/time4tea/gopro-dashboard-overlay](their manual) for more info.
Nor does it provide all of the possible command line options / switches to the tool. For example, i had a video in which i drove my bicycle up to 71 kp/h. The dashboard tool stopped rendering the speed above 60 kph. I dicovered that the tool has a --gps-speed-max option that i could use to fix this. By passing --gps-speed-max 80, i could indicate that i drove max 80 kp/h. This tool does not provide a way to set that option amongst some others. But before it executes the command, it will show it to you. Allowing you to copy it, and add additional options like the --gps-speed-max option manually. 

I accept pull requests if any one wants to incorporate such exta options in the tool. At the moment of writing i dont have time available to add such feature properly.
