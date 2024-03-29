#!/usr/bin/env node

'use strict';

var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var Set = require('collections/set');

var token = crypto.createHash('md5').update(Date.now() + Math.random() + '').digest('hex') + '';
var tmp = path.join(__dirname, '/data/tmp/', token);
var muscle = path.join(__dirname, '/Muscle/muscle3.8.31_i86Linux64');

var sequencePath = process.argv[2];
var referencePath = path.join(__dirname, './data/RSRS.fa');
var dbPath = path.join(__dirname, './data/fingerprints');
var encoding = {encoding: 'ascii'};

fs.exists(sequencePath, function (exist) {
    if (!exist) throw new Error('File not found: ' + sequencePath);

    var sequence = fs
        .readFileSync(sequencePath, encoding)
        .replace(/\r/g, '')
        .split('\n')
        .filter(function(s) { return s !== '' });

    var header = sequence.shift();
    sequence = sequence.join('');

    var reference = fs
        .readFileSync(referencePath, encoding)
        .replace(/\r/g, '')
        .split('\n')
        .filter(function(s) { return s !== '' });

    var refHeader = reference.shift();
    reference = reference.join('');

    var db = [];
    fs
        .readFileSync(dbPath, encoding)
        .split('\n')
        .filter(function(s) { return s !== '' })
        .forEach(function(s) {
            db.push(new Set(('' + s).split(',')));
        });

    var content = header + '\n' + sequence + '\n\n' + refHeader + '\n' + reference;
    fs.writeFileSync(tmp, content, encoding);

    // ------ ------ ------ ------ ------ //

    spawn(muscle, ['-in', tmp, '-out', tmp + '.m', '-maxiters', '1', '-diags'])
        .on('close', function (code) {
            if (code == 0) {

                var content = [];
                var line = '';
                var raw = fs
                    .readFileSync(tmp + '.m', encoding)
                    .replace(/\r/g, '')
                    .split('\n')
                    .filter(function(s) { return s !== '' });

                for (var j = 0; j < raw.length; j++) {
                    if (raw[j][0] == '>') {
                        content.push(line);
                        content.push(raw[j]);
                        line = '';
                    }
                    else line += raw[j];
                }
                content.push(line);

                if (content[1] == '>RSRS') {
                    refHeader = content[1]; reference = content[2];
                    header = content[3]; sequence = content[4];
                } else {
                    refHeader = content[3]; reference = content[4];
                    header = content[1]; sequence = content[2];
                }

                var differences = [];
                var position = 0;
                for (var i = 0; i < reference.length; i++) {
                    if ((reference[i] == '-') && (sequence[i] == '-')) continue;
                    if (reference[i] != '-') position++;


                    if (sequence[i] != '-') {
                        if (sequence[i] != reference[i])
                            if (reference[i] != 'N')
                                if (reference[i] != '-')
                                    differences.push(reference[i] + position + sequence[i]);
                                else
                                    differences.push(position + '.' + sequence[i]);
                    }
                }

                var d = new Set(differences);

                var max = -50000;
                var result = [];
                db.forEach(function(s) {
                    var score = s.intersection(d).toArray().length - s.difference(d).toArray().length;
                    if (score > max) {
                        max = score;
                        result = s.symmetricDifference(d).toArray();
                    }
                });

                db.forEach(function(s) {
                    var score = s.intersection(d).toArray().length - s.difference(d).toArray().length;

                    if (score == max) {
                        console.log(s.symmetricDifference(d).toArray()[0]);
                    }
                });

                // Если очень много данных отсутствует
                //if (max == 0) {
                //    db.forEach(function(s) {
                //        var score = s.intersection(d).toArray().length;
                //        if (score > max) {
                //            max = score;
                //            result = s.symmetricDifference(d).toArray();
                //        }
                //    });
                //
                //    db.forEach(function(s, i) {
                //        var score = s.intersection(d).toArray().length;
                //
                //        if (score == max) {
                //            console.log(s.symmetricDifference(d).toArray()[0]);
                //        }
                //    });
                //}

                fs.unlinkSync(tmp);
                fs.unlinkSync(tmp + '.m');
                process.exit(0);
            }
        })
});