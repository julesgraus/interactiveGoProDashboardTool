import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output, stderr as error_output } from 'node:process';
import { access, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const rl = readline.createInterface({ input, output });

let videoDir = null;
let videoFile = null;
let layoutFile = null;
let gpxFile = null;

/**
 * This function is the main function and directs all other subcomponents.
 * It is triggered at the bottom of this file
 */
function main() {
    promptVideoDir().then(dir => {
        videoDir = dir
        output.write('videoDir set to: ' + videoDir + '\n');
        return promptVideoFile();
    }).then((inputVideoFile) => {
        videoFile = inputVideoFile
        return promptLayout()
    }).then((inputLayout) => {
        layoutFile = inputLayout
        return promptGpx()
    }).then((inputGpx) => {
        gpxFile = inputGpx

        const args = makeCommandArgsForDashboard(
            videoDir,
            videoFile,
            gpxFile,
            layoutFile,
            outputFileName(videoFile)
        )

        output.write('videoDir:' + videoDir + '\n');
        output.write('videoFile:' + videoFile + '\n');
        output.write('layoutFile:' + layoutFile + '\n');
        output.write('gpx:' + gpxFile + '\n');
        output.write('outputVideoFile:' + outputFileName(videoFile) + '\n\n');
        output.write('Executing command: python3 ' + args.join(' ') + '\n')
        return args;
    }).then((args) => {
        return new Promise((resolve, reject) => {
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

    }).then((code) => {
        output.write('Done. Have a nice day!');
        process.exit(code);
    }).catch((error) => {
        output.write(error.message+'\n');
        main();
    })
}

/**
 * Request the user to specify the input video directory
 *
 * @return {PromiseLike<string>}
 */
function promptVideoDir() {
    return rl.question('Which directory contains the video?\n')
        .then((answer) => answer.trim())
        .then(answer => {
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
    return readdir(videoDir).then(files => files.filter(file => file.match(/.+\.mp4$/i)))
        .then(videos => {
            if(!videos.length) {
                throw new Error('The folder did not contain video files')
            }

            videos.forEach((video, index) => {
                output.write(index + 1 + ') '+ video + '\n')
            })

            return rl.question('Which video file? Type the number in front of it.\n').then((answer) => answer.trim())
                .then(answer => {
                    const number = parseInt(answer);
                    if(isNaN(number) || number < 1 || number > videos.length) {
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
    return readdir(videoDir).then(files => files.filter(file => file.match(/.+\.xml$/i)))
        .then(layouts => {
            if(!layouts.length) {
                return null;
            }

            layouts.forEach((layout, index) => {
                output.write(index + 1 + ') '+ layout + '\n')
            })

            return rl.question('Which layout? Type the number in front of it.\n').then((answer) => answer.trim())
                .then(answer => {
                    const number = parseInt(answer);
                    if(isNaN(number) || number < 1 || number > layouts.length) {
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
    return readdir(videoDir).then(files => files.filter(file => file.match(/.+\.gpx$/i)))
        .then(gpx => {
            if(!gpx.length) {
                return null;
            }

            gpx.forEach((gpx, index) => {
                output.write(index + 1 + ') '+ gpx + '\n')
            })

            return rl.question('Which GPX? Type the number in front of it.\n').then((answer) => answer.trim())
                .then(answer => {
                    const number = parseInt(answer);
                    if(isNaN(number) || number < 1 || number > gpx.length) {
                        return promptLayout();
                    }

                    return gpx[number - 1];
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
    if(parts < 2) return inputName;

    parts.splice(parts.length - 1, 0, '_dashboard')
    return [parts.slice(0, -1).join(''), (parts[parts.length - 1])].join('.');
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
    return [
        'venv/bin/gopro-dashboard.py',

        //Privacy settings
        requestsPrivacy ? '--privacy' : '',
        requestsPrivacy ? privacyLat + ',' +  privacyLong + ',' + privacyDiameter : '',

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

main();
