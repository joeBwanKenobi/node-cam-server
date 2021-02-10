const path = require('path');
const fs = require('fs');
const spawn = require('child_process').spawn;
const ffmpeg = require('fluent-ffmpeg');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const app = express();

const PORT = 5000;
var format = 'hls';
var frameRate = 25
var outputDir = path.resolve('./camera');
console.log(outputDir);

var cameraOpts = ['-o', '-', '-t', 0, '-w', 1280, '-h', 720, '-fps', frameRate, '-g', frameRate, '-n'];
const cameraStream = spawn('raspivid', cameraOpts);

const conversionStream = ffmpeg(cameraStream.stdout)
    .inputFPS(frameRate)
    .noAudio();

if (format === 'hls') {
    let outputOpts = [
        '-hls_time', 2,
        '-hls_list_size', 10,
        '-hls_delete_threshold', 10,
        '-hls_flags', 'split_by_time+delete_segments+second_level_segment_index',
        '-strftime', 1,
        '-hls_segment_filename', path.join(outputDir, '%s-%%d.m4s'),
        '-hls_segment_type', 'fmp4'
    ]

    conversionStream
        .videoCodec('copy')
        .format('hls')
        .inputOptions(['-re'])
        .outputOptions(outputOpts)
        .output(path.join(outputDir, 'livestream.m3u8'));
}

conversionStream
    .on('start', (data) => {
        console.log(`Spawned Ffmpeg with command: ${data}`);
    })
    .on('error', (err) => {
        console.log(err);
    })
    .on('stderr', (stderr) => {
        console.log(stderr)
    })
    .run();

    app.get('/', function(req, res) {
        res.sendFile(path.join(__dirname + '/index.html'));
    });

    app.use(cors());
    app.use(compression({level: 9}));
    app.use('/camera', express.static(outputDir))

    

    app.listen(PORT, () => {
        console.log(`Server now listening on ${PORT}`)
    });