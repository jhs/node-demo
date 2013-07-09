var fs = require('fs')
var http = require('http')
var drone = require('ar-drone')
var websocket = require('ws')
var dronestream = require('dronestream')

var IP = '192.168.3.7'

var httpd = http.createServer(handler)
httpd.listen(8888, '0.0.0.0')
dronestream.listen(httpd, {'ip':IP})
console.log('Server at http://two.local:8888')

function handler(req, res) {
  console.log('%s %s', req.method, req.url)

  if(req.url != '/')
    return res.end('Not found')

  res.setHeader('content-type', 'text/html')
  fs.createReadStream('index.html').pipe(res)
}

var state = {}
var drone = drone.createClient({'ip':IP})

drone.on('batteryChange', function(level) {
  state.battery = level
})

drone.on('navdata', function(navdata) {
  var demo = navdata.demo || {}
  state.controlState = demo.controlState
  state.altitude     = demo.altitude

  var rotation = demo.rotation || {}
  state.pitch = rotation.pitch
  state.roll  = rotation.roll
  state.yaw   = rotation.yaw
  //state.extra = require('util').inspect(navdata)
})

var WS = websocket.Server
var ws = new WS({server:httpd, path:'/socket'})

ws.on('connection', function(socket) {
  console.log('New web socket')

  socket.on('message', function(msg) {
    console.log('RECV: %j', msg)

    if(msg == 'takeoff') {
      drone.ftrim()
      setTimeout(function() { drone.takeoff() }, 3000)
    }

    if(msg == 'land')
      drone.land()

    if(msg == 'turn') {
      drone.clockwise(1)
      setTimeout(function() { drone.stop() }, 3000)
    }
  })

  var updater = setInterval(send_state, 250)
  socket.on('close', function() {
    clearInterval(updater)
  })

  function send_state() {
    var message = JSON.stringify(state)
    socket.send(message)
  }
})
