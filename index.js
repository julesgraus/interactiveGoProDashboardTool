import * as readline from 'node:readline/promises';
import {stdin as input, stdout as output, stderr as error_output} from 'node:process';
import {access, readdir, writeFile, readFile, unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import SettingsBag from "./settingsbag.js";

const rl = readline.createInterface({input, output});

let settingsCacheFile = './iadt.json'

let settings = defaultSettings();

/**
 * This function is the main function and directs all other subcomponents.
 * It is triggered at the bottom of this file
 */
function main() {
    loadSettings().then((loadedSettings) => {
        settings = loadedSettings;
        return promptVideoDir()
    }).then(dir => {
        settings.videoDir = dir
        output.write('videoDir set to: ' + settings.videoDir + '\n');
        return promptVideoFile();
    }).then((inputVideoFile) => {
        settings.videoFile = inputVideoFile
        return promptLayout()
    }).then((inputLayout) => {
        settings.layoutFile = inputLayout
        return promptGpx()
    }).then((inputGpx) => {
        settings.gpxFile = inputGpx;
        return promptPrivacy();
    }).then((privacyData) => {
        return prepareCommandLineArguments(privacyData);
    }).then((args) => {
        return renderOverlay(args);
    }).then((code) => {
        saveSettings().then(() => {
            output.write('Done. Have a nice day!');
            process.exit(code);
        })
    }).catch((error) => {
        output.write(error.message + '\n');
        main();
    })
}

/**
 * Request the user to specify the input video directory
 *
 * @return {PromiseLike<string>}
 */
function promptVideoDir() {
    return rl.question('Which directory contains the video' + (settings.videoDir?.length ? ' (default: ' + settings.videoDir + ')' : '') + '?\n')
        .then((answer) => answer.trim())
        .then(answer => {
            if (answer.length === 0 && settings.videoDir?.length) answer = settings.videoDir;

            return access(answer)
                .then(() => answer)
                .catch(reason => {
                    output.write('Invalid directory. Try again or press control + c.\n')
                    return promptVideoDir();
                })
        })
}

/**
 * Request the user to specify the video filename.
 *
 * @return {PromiseLike<string>}
 */
function promptVideoFile() {
    return readdir(settings.videoDir).then(files => files.filter(file => file.match(/.+\.mp4$/i)))
        .then(videos => {
            if (!videos.length) {
                throw new Error('The folder did not contain video files')
            }

            const videoOptions = videos
                .map((video, index) => index + 1 + ') ' + video)
                .join('\n')

            return rl.question('Which video file? \n' + videoOptions + ' \n').then((answer) => answer.trim())
                .then(answer => {
                    const number = parseInt(answer);
                    if (isNaN(number) || number < 1 || number > videos.length) {
                        return promptVideoFile();
                    }

                    return videos[number - 1];
                })
        })
}

/**
 * Request the user to specify the layout xml filename.
 *
 * @return {PromiseLike<string>}
 */
function promptLayout() {
    return readdir(settings.videoDir).then(files => files.filter(file => file.match(/.+\.xml$/i)))
        .then(layouts => {
            if (!layouts.length) {
                return null;
            }

            const layoutOptions = layouts
                .map((layout, index) => index + 1 + ') ' + layout)
                .join('\n')

            return rl.question('Which layout' +
                (settings.layoutFile?.length ? ' (default: ' + settings.layoutFile + ')' : '') +
                '?\n' + layoutOptions + '\n'
            ).then((answer) => answer.trim())
                .then(answer => {
                    if (answer.length === 0 && settings.layoutFile?.length && layouts.includes(settings.layoutFile)) {
                        return settings.layoutFile;
                    }

                    const number = parseInt(answer);
                    if (isNaN(number) || number < 1 || number > layouts.length) {
                        return promptLayout();
                    }

                    return layouts[number - 1];
                })
        })
}

/**
 * Request the user to specify the GPX filename.
 *
 * @return {PromiseLike<string>}
 */
function promptGpx() {
    return readdir(settings.videoDir).then(files => files.filter(file => file.match(/.+\.gpx$/i)))
        .then(gpxFiles => {
            if (!gpxFiles.length) {
                return null;
            }

            const gpxOptions = gpxFiles
                .map((gpxFile, index) => index + 1 + ') ' + gpxFile)
                .join('\n')

            return rl.question('Which GPX' +
                (settings.gpxFile?.length ? ' (default: ' + settings.gpxFile + ')' : '') +
                '?\n' + gpxOptions + '\n').then((answer) => answer.trim())
                .then(answer => {
                    if (answer.length === 0 && settings.gpxFile?.length && gpxFiles.includes(settings.gpxFile)) {
                        return settings.gpxFile;
                    }

                    const number = parseInt(answer);
                    if (isNaN(number) || number < 1 || number > gpxFiles.length) {
                        return promptLayout();
                    }

                    return gpxFiles[number - 1];
                })
        })
}

/**
 * Request the user to specify a zone that a component should not render data in (like the trail of a route on a map).
 * Just for privacy reasons
 *
 * @return {PromiseLike<{lat: string|null, long: string|null, radius: string|null}>}
 */
function promptPrivacy() {
    return new Promise((resolve, reject) => {
        let privacyData = {lat: null, long: null, radius: null};

        const privacyDataSet = settings.latitude?.length && settings.longitude?.length && settings.privacyRadius?.length;

        rl.question(
            'Do you want to specify a privacy zone? Type y for yes. n or something else for no.' +
            (privacyDataSet ? ' (default: y)' : '') + '\n'
        ).then((response) => {
            if (response !== 'y' && response !== '') {
                resolve(privacyData)
            } else {
                rl.question('What is the latitude of the privacy zone' + (settings.latitude?.length ? ' (default: ' + settings.latitude + ')' : '') + '?\n').then(lat => {
                    if (lat.length === 0 && settings.latitude?.length) lat = settings.latitude;
                    privacyData.lat = lat.length > 0 ? lat : null;
                    return rl.question('What is the longitude of the privacy zone' + (settings.longitude?.length ? ' (default: ' + settings.longitude + ')' : '') + '?\n')
                }).then(long => {
                    if (long.length === 0 && settings.longitude?.length) long = settings.longitude;
                    privacyData.long = long.length > 0 ? long : null;
                    return rl.question('What is the radius of the privacy zone' + (settings.privacyRadius?.length ? ' (default: ' + settings.privacyRadius + ')' : '') + '?\n')
                }).then(radius => {
                    if (radius.length === 0 && settings.privacyRadius?.length) radius = settings.radius;
                    privacyData.radius = radius.length > 0 ? radius : null;

                    if (!privacyData.lat || !privacyData.long || !privacyData.radius) {
                        resolve(promptPrivacy());
                    }

                    resolve(privacyData)
                })
            }
        })
    })
}

/**
 * Converts a file name like this "my_mp4.mp4" to a file name like this "my_mp4_dashboard.mp4".
 *
 * @param inputName
 * @return {string|*}
 */
function outputFileName(inputName) {
    const parts = inputName.split('.');
    if (parts < 2) return inputName;

    parts.splice(parts.length - 1, 0, '_dashboard')
    return [parts.slice(0, -1).join(''), (parts[parts.length - 1])].join('.');
}

/**
 * Load settings from a file. If the file does not exist, create it first
 */
function loadSettings() {
    return access(settingsCacheFile).then(() => {
        return readFile(settingsCacheFile, {encoding: 'utf8'})
            .then(settings => SettingsBag.fromJsonString(settings))
    }).catch((e) => {
        const settings = defaultSettings();
        writeFile(settingsCacheFile, JSON.stringify(settings))
        return settings;
    })
}

/**
 * Load settings from a file. If the file does not exist, create it first
 */
function saveSettings() {
    return new Promise((resolve, reject) => {
        writeFile(settingsCacheFile, JSON.stringify(settings))
            .then(() => resolve(settings))
    })
}

function defaultSettings() {
    const settingsBag = new SettingsBag();
    settingsBag.videoDir = null;
    settingsBag.videoFile = null;
    settingsBag.layoutFile = null;
    settingsBag.gpxFile = null;
    settingsBag.latitude = null;
    settingsBag.longitude = null;
    settingsBag.privacyRadius = null;

    return settingsBag;
}

/**
 * @param {string} videoDir The directory that contains the gopro video files. Without trailing slash. Example: /Users/yourname/videos
 * @param {string} videoFile The name of the video file in the videoDir that you want to apply the dashboard on. Example: GX020125.MP4
 * @param {string} gpxFile The name of the .gpx file in the videoDir that contains route and telemetry data. Example: activity_9344542425.gpx
 * @param layoutFile The name of the xml file in the videoDir that defines the "dashboard layout". Example: Gopro_velo.xml
 * @param outputFileName The name of the output file. It will be placed in the videoDir. Example: GX020125_dashboard.MP4
 * @param privacyLat The latitude of a position that various layout components should not render in. Example: 52.132633
 * @param privacyLong The longitude of a position that various layout components should not render in. Example: 5.291266
 * @param privacyDiameter The diameter of the lat / long position that specifies the circle, layout components should not render in: Example: 0.5
 * @return {string[]}
 */
function makeCommandArgsForDashboard(
    videoDir,
    videoFile,
    gpxFile,
    layoutFile,
    outputFileName,
    privacyLat = null,
    privacyLong = null,
    privacyDiameter = null
) {
    const requestsPrivacy = privacyLat && privacyLong && privacyDiameter;

    // console.log('>>>', requestsPrivacy ? 'yes' : 'no', privacyLat, privacyLong, privacyDiameter);

    return [
        'venv/bin/gopro-dashboard.py',

        //Privacy settings
        requestsPrivacy ? '--privacy' : '',
        requestsPrivacy ? privacyLat + ',' + privacyLong + ',' + privacyDiameter : '',

        //Font settings
        '--font', 'Verdana.ttf',

        //Layout settings
        '--layout',
        'xml',
        '--layout-xml', videoDir + '/' + layoutFile,

        //Gpx file for the telemetry data
        '--gpx', videoDir + '/' + gpxFile,

        //Input file
        videoDir + '/' + videoFile,

        //Output file
        videoDir + '/' + outputFileName,
    ];
}

/**
 * @param {{long: string|null, lat: string|null, radius: string|null }} privacyData
 * @return {string[]}
 */
function prepareCommandLineArguments(privacyData) {
    settings.longitude = privacyData.long;
    settings.latitude = privacyData.lat;
    settings.privacyRadius = privacyData.radius;


    const args = makeCommandArgsForDashboard(
        settings.videoDir,
        settings.videoFile,
        settings.gpxFile,
        settings.layoutFile,
        outputFileName(settings.videoFile),
        settings.latitude,
        settings.longitude,
        settings.privacyRadius,
    )

    output.write('videoDir:' + settings.videoDir + '\n');
    output.write('videoFile:' + settings.videoFile + '\n');
    output.write('layoutFile:' + settings.layoutFile + '\n');
    output.write('gpx:' + settings.gpxFile + '\n');
    if (settings.latitude && settings.longitude && settings.radius) {
        output.write('privacy lat,long,radius:' + [settings.latitude, settings.longitude, settings.radius].join(',') + '\n');
    }
    output.write('outputVideoFile:' + outputFileName(settings.videoFile) + '\n\n');
    return args;
}

function renderOverlay(args) {
    return new Promise((resolve, reject) => {
        args = args.filter(arg => arg && arg.length);
        output.write('Executing command: python3 ' + args.join(' ') + '\n\n')

        let cmd;
        try {
            cmd = spawn('python3', args);
        } catch (e) {
            output.write(e);
        }
        cmd.stdout.on('data', data => output.write(data + '\n'))
        cmd.stderr.on('data', data => error_output.write(data + '\n'))
        cmd.on('close', code => resolve(code))
        cmd.on('error', err => reject(err))
    })
}

main();
