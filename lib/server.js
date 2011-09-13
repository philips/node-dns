/*
Copyright 2011 Timothy J Fontaine <tjfontaine@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN

*/

var dgram = require('dgram')
var EventEmitter = require('events').EventEmitter
var util = require('util')

var Header = require('./header')
var Question = require('./question')
var Response = require('./response')

var Server = function(type) {
  this.socket = dgram.createSocket(type)
  var self = this
  this.socket.on('message', function(msg, remote) {
    self.handleMessage(msg, remote)
  })
  this.socket.on('listen', function() { self.emit('listen') })
  this.socket.on('close', function() { self.emit('close') })
}
util.inherits(Server, EventEmitter)

Server.prototype.bind = function(port, ip) {
  this.socket.bind(port, ip)
}

Server.prototype.close = function() {
  this.socket.close()
}

Server.prototype.address = function() {
  return this.socket.address()
}

Server.prototype.handleMessage = function(msg, remote) {
  var h = new Header()
  var t = msg.slice(0, h.size)
  h.unpack(t)
  var pos = h.size

  var request = {
    header: h,
    rinfo: remote,
    questions: [],
  }

  for (var i=0; i<h.qdcount; i++) {
    var q = new Question()
    q.unpack(msg.slice(pos))
    pos += q.size
    request.questions.push(q)
  }

  var response = new Response(this.socket, remote, h)

  this.emit('request', request, response)
}

exports.createServer = function(type) {
  return new Server(type)
}