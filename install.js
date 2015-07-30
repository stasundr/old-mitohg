#!/usr/bin/env node

'use strict';

var fs = require('fs');
var path = require('path');

var depth = function(_s) {
    return ((';' + _s).match(/^;+/) + '').length
};

var hgs = [];
var tails = [];

var raw = path.join(__dirname, 'data/rawDB.csv');
var t = fs
    .readFileSync(raw, {encoding: 'ascii'})
    .split('\r')
    .filter(function(s) { return s.replace(/;+/, '') != '' })
    .map(function(s) {
        return s
            .replace(/;$/g, '')
            .replace(/[A-Za-z]+[0-9]+$/, '')
            .replace(/;+$/, '')
            .replace(/[A-Za-z]+[0-9]+$/, '')
            .replace(/;+$/, '')
            .replace(/!/g, '');
    })
    .map(function(s) {
        var r = (s.replace(/^;+/, '').match(/^\s/))
            ? s.replace(' ', 'PARENT-').replace(/\s+/g, '-').replace(/-$/, ';').replace(/^;/, '')
            : s;

        if (r.match(/-/)) {
            r += ' ' + r.replace(/;/g, '').replace(/^.+-/, '');
        }

        return r;
    })
    .forEach(function(s, i, data) {
        var rootHg = function(where) {
            var currentDepth = depth(data[where]);
            if (currentDepth > 1) {
                var j = where;
                while (currentDepth <= depth(data[j])) j--;

                if (depth(data[j]) >= 1) {
                    var tmp = data[j].trim().replace(/;\s/, ';  ').split('  ');
                    tmp.shift();
                    tmp += '';
                    tail += ' ' + tmp.replace(/,/g, '  ');
                    rootHg(j);
                }
            }
        };

        var tail = '';
        rootHg(i);

        var value = (data[i] + tail).trim().replace(/\s+/g, ' ').split(' ');
        hgs.push(value.shift());
        tails.push(value);
    });

hgs = hgs.map(function(s, i) {
    if (s.match(/PARENT/)) {
        var d = depth(s);
        while (d <= depth(hgs[i])) i--;

        return s.replace(/PARENT/, hgs[i].replace(/;/g, ''))
    } else return s;
});

hgs.forEach(function(hg, i) {
    var r = hg.replace(/;/g, '') + ',' + (tails[i] + '').toUpperCase();
    r = r.split(',');

    for (var j = r.length; j > 2; j--)
    for (var k = j - 1; k > 1; k--)
        if (((r[k] + '').replace(/[A-Z]/g, '') == (r[j] + '').replace(/[A-Z]/g, '')) && (r[k][0] == r[j][r[j].length - 1])) {
            r[k] = '';
            r[j] = '';
        }

    console.log(r.join(',').replace(/,+/g, ',').replace(/\.[0-9X]/g, '.') + '\n');
});