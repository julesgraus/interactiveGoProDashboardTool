import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output, stderr as error_output } from 'node:process';
import { access, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const rl = readline.createInterface({ input, output });

let videoDir = null;
let videoFile = null;
let layoutFile = null;
let gpxFile = null;

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
        const args = makeCommandArgs(videoDir, videoFile, gpxFile, layoutFile, outputFileName(videoFile))

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

function outputFileName(inputName) {
    const parts = inputName.split('.');
    if(parts < 2) return inputName;

    parts.splice(parts.length - 1, 0, '_dashboard')
    return [parts.slice(0, -1).join(''), (parts[parts.length - 1])].join('.');
}

function makeCommandArgs(videoDir, videoFile, gpxFile, layoutFile, outputFileName) {
    return [
        'venv/bin/gopro-dashboard.py',
        '--privacy', '51.317800,5.991870,0.5',
        '--font', 'Verdana.ttf',
        '--layout', 'xml',
        '--layout-xml', videoDir + '/' + layoutFile,
        '--gpx', videoDir + '/' + gpxFile,
        videoDir + '/' + videoFile,
        videoDir + '/' + outputFileName,
    ];
}


main();
