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

"use strict";

var dgram = require('dgram'),
  EventEmitter = require('events').EventEmitter,
  net = require('net'),
  util = require('util'),
  Socket = require('./socket'),
  Packet = require('./packet');

var Server = function (type) {
  var self = this;
  this.udp_socket = dgram.createSocket(type);

  this.udp_socket.on('message', function (msg, remote) {
    self.handleMessage(msg, new Socket(self.udp_socket, remote));
  });

  this.udp_socket.on('listen', function () {
    self.emit('listen');
  });

  this.udp_socket.on('close', function () {
    self.emit('close');
  });

  this.tcp_socket = net.createServer(function (client) {
    client.on('data', function (data) {
      var len = data.readUInt16BE(0);
      self.handleMessage(data.slice(2, len + 2), new Socket(null, client));
    });
  })
};
util.inherits(Server, EventEmitter);

Server.prototype.bind = function (port, ip) {
  this.udp_socket.bind(port, ip);
  this.tcp_socket.listen(port, ip);
};

Server.prototype.close = function () {
  this.udp_socket.close();
};

Server.prototype.address = function () {
  return this.udp_socket.address();
};

Server.prototype.handleMessage = function (msg, remote) {
  var request = new Packet(remote),
    response = new Packet(remote);

  try {
    request.unpack(msg);

    response.header.id = request.header.id;
    response.header.qr = 1;
    response.question = request.question;

    this.emit('request', request, response);
  } catch (e) {
    this.emit('error', e, msg, response);
  }
};

exports.createServer = function (type) {
  return new Server(type);
};
