"use strict";

var RE_XMLSPECIAL = /[<>&"]/g;
var xmlEscape = function(v) {
	return (v+'').replace(RE_XMLSPECIAL, function(m) {
		switch(m) {
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '&': return '&amp;';
			case '"': return '&quot;';
		}
	});
};

var objIsEmpty = function(o) {
	for(var k in o) return false;
	return true;
};

function NZBGenerator(meta, writeFunc, packed, encoding) {
	var newline = '\r\n', indent = '\t';
	if(packed)
		newline = indent = '';
	
	this._write = writeFunc;
	this.encoding = encoding;
	
	var data = '';
	
	if(meta && !objIsEmpty(meta)) {
		data = indent + '<head>' + newline;
		for(var k in meta) {
			data += indent + indent + '<meta type="' + xmlEscape(k) + '">' + xmlEscape(meta[k]) + '</meta>' + newline;
		}
		data += indent + '</head>' + newline;
	}
	
	this.write('<?xml version="1.0" encoding="' + encoding + '"?>' + newline
		+ '<!DOCTYPE nzb PUBLIC "-//newzBin//DTD NZB 1.1//EN" "http://www.newzbin.com/DTD/nzb/nzb-1.1.dtd">' + newline
		+ '<nzb xmlns="http://www.newzbin.com/DTD/2003/nzb">' + newline + data);
	
	this.indent = indent;
	this.newline = newline;
	this.segNum = null;
	
	this._fileEnd = this.indent + this.indent + '</segments>' + this.newline
	              + this.indent + '</file>' + this.newline;
}
NZBGenerator.prototype = {
	_closeFile: function() {
		return this.segNum !== null ? this._fileEnd : '';
	},
	file: function(subject, poster, groups, date) {
		this.write(this._closeFile() + this._fileXml(subject, poster, groups, date));
		this.segNum = 0;
	},
	wholeFile: function(subject, poster, groups, date, segments) {
		var data = this._closeFile() + this._fileXml(subject, poster, groups, date);
		// forEach skips over sparse arrays, so use regular for
		for(var i=0; i<segments.length; i++) {
			if(segments[i])
				data += this._segmentXml(i+1, segments[i][0], segments[i][1]);
		}
		
		this.write(data + this._fileEnd);
		this.segNum = null;
	},
	_fileXml: function(subject, poster, groups, date) {
		date = date || Date.now();
		
		var indent = this.indent, newline = this.newline;
		// the official spec [http://wiki.sabnzbd.org/nzb-specs] double-escapes the poster, which is probably a mistake on their end
		return indent + '<file poster="' + xmlEscape(poster) + '" date="' + ((date/1000)|0) + '" subject="' + xmlEscape(subject) + '">' + newline
			+ indent + indent + '<groups>' + newline
			+ groups.map(function(g) {
				return indent+indent+indent + '<group>' + xmlEscape(g) + '</group>' + newline;
			}).join('')
			+ indent + indent + '</groups>' + newline
			+ indent + indent + '<segments>' + newline;
	},
	addSegment: function(size, messageId) {
		this.segNum++;
		this.write(this._segmentXml(this.segNum, size, messageId));
	},
	_segmentXml: function(segNum, size, messageId) {
		return this.indent+this.indent+this.indent + '<segment bytes="'+size+'" number="'+segNum+'">' + xmlEscape(messageId) + '</segment>' + this.newline;
	},
	end: function() {
		this.write(this._closeFile() + '</nzb>' + this.newline);
	},
	write: function(str) {
		this._write(str, this.encoding);
	}
};

module.exports = NZBGenerator;
