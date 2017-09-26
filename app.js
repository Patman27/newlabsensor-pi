/*
 * Newlab sensor platform prototype
 *
 * Built for Superbright (www.superbright.me)  by Patrick Cleary
 *
 * This app requires Node.js v8.x to run!
 * For installation instructions, please consult http://github.com/nodesource/distributions
 * under the heading "Installation Instructions".
 *
 */

// Prints sensor data to the terminal if enabled
var debugEnabled = true;

// Dependencies needed to allow system shutdown via Node.js
var util = require('util');
var exec = require('child_process').exec;
var child;


// AWS IoT device name / client ID
var deviceName = 'newlabsensor-test-1'; // must be the same as AWS IoT client ID

// AWS IoT device class
var awsIoT = require('aws-iot-device-sdk');

// AWS IoT client identifiers
var device = awsIoT.device({
	keyPath: './aws-keys/newlabsensor-test-1.private.key', // this device's private key path
	certPath: './aws-keys/newlabsensor-test-1.cert.pem', // this device's certificate path
	caPath: './aws-keys/root-CA.crt', // root CA certificate path
	clientID: deviceName, // this device's unique client identifier
	host: 'a3958o3k876wh2.iot.us-east-1.amazonaws.com' // this device's unique custom endpoint
});

// AWS MQTT topics
var pirTopic = 'sensors/pir';
var soundTopic = 'sensors/sound';
var systemTopic = 'system';


// GrovePi sensor board deps
//   GrovePi module
var GrovePi = require('node-grovepi').GrovePi;

//   GrovePi base classes
var Commands = GrovePi.commands;
var Board = GrovePi.board;

//   GrovePi sensor classes
//     Grove PIR sensor (simple digital on/off)
var pirDigitalSensor = GrovePi.sensors.DigitalInput;
//     Grove sound sensor (uses same class as the loudness sensor)
var soundAnalogSensor = GrovePi.sensors.LoudnessAnalog;
//     Grove pushbutton (simple digital on/off)
var buttonDigitalSensor = GrovePi.sensors.DigitalButton;

// Grove Sensor Pins
var pirSensorPin = 3; // digital input for the PIR sensor
var soundSensorPin = 1; // analog input for the sound sensor
var shutdownButtonPin = 4; // digital input for the pushbutton used for system shutdown

// Grove sound sensor capture period, in milliseconds
var soundCapturePeriod = 5000;

// Grove pushbutton timeout to initiate Pi shutdown, in milliseconds
var shutdownButtonTimeout = 3000;

// Sends a periodic "heartbeat" to AWS to confirm the system is still operational
var heartbeatEnabled = true;

// Period for "heartbeat", in minutes
var heartbeatPeriod = 0.1;

// -------- Begin code --------

// Intantiate the GrovePi board and add sensors
var board = new Board({
	debug: true,
	onError: function(err) {
		console.log('Something just went wrong');
		console.log(err);
	},
	onInit: function(res) {
		if (res) {
			console.log('GrovePi Version :: ' + board.version());

			// Begin monitoring the PIR sensor with the Grove "watch" method
			var pirSensor = new pirDigitalSensor(pirSensorPin);
			if (debugEnabled == true){
				console.log('PIR Digital Sensor (start watch)');
			}
			pirSensor.on('change', function(res) {
				var output = {
					clientID:deviceName,
					timestamp:new Date().toISOString(),
					motionDetected:res
				}
				device.publish(pirTopic, JSON.stringify(output, null, 2));
				if (debugEnabled == true) {
					console.log(JSON.stringify(output, null, 2));
				}
			});
			pirSensor.watch(200); // delay referenced from GrovePi Python example code

			// Begin monitoring the sound sensor for max and average values with the Grove "start" method
			var soundSensor = new soundAnalogSensor(soundSensorPin);
			if (debugEnabled == true) {
				console.log('Sound Analog Sensor (start monitoring - reporting results every ' + (soundCapturePeriod/1000) + ' seconds)');
			}
			soundSensor.start();
			setInterval(soundSensorGetAvgMax, soundCapturePeriod, soundSensor);

			// Begin watching the shutdown button for a long press + release with the Grove "watch" method
			var shutdownButton = new buttonDigitalSensor(shutdownButtonPin, shutdownButtonTimeout);
			if (debugEnabled == true){
				console.log('Shutdown Button Sensor (start watch)');
			}
			// Shut the system down in the event of a long press + release, and log to AWS
			shutdownButton.on('down', function(res) {
				if (res == 'longpress') {
					var output = {
						clientID:deviceName,
						timestamp:new Date().toISOString(),
						status:'shutdown-button',
						message:'System shutdown initiated - shutdown button pressed for longer than ' + (shutdownButtonTimeout/1000) + ' seconds'
					}
					device.publish(systemTopic, JSON.stringify(output, null, 2));
					console.log(JSON.stringify(output, null, 2));
					initiateShutdown();
				}
			});
			shutdownButton.watch();
		}
	}
});


// Function to get the average and max sound sensor levels
function soundSensorGetAvgMax(soundSensor) {
	var res = soundSensor.readAvgMax();
	var output = {
	clientID:deviceName,
	timestamp:new Date().toISOString(),
	soundAvgValue:Math.round(res.avg),
	soundMaxValue:res.max
	}
	device.publish(soundTopic, JSON.stringify(output, null, 2));
	if (debugEnabled == true) {
		console.log(JSON.stringify(output, null, 2));
	}
}


// Exit function, referenced from GrovePi's "basicTest.js"
function onExit (err) {
	var output = {
		clientID:deviceName,
		timestamp:new Date().toISOString(),
		status:'exit-terminal',
		message:'Node app exited via terminal'
	}
	device.publish(systemTopic, JSON.stringify(output, null, 2));
	console.log(JSON.stringify(output, null, 2));
	console.log('Exiting...');
	board.close();
	process.removeAllListeners();
	process.exit();
	if (typeof err != 'undefined') {
		console.log(err);
	}
}


// AWS IoT debug logging
device.on('connect', function() {
	var output = {
		clientID:deviceName,
		timestamp:new Date().toISOString(),
		status:'iot-connected',
		message:'AWS IoT connected'
	}
	device.publish(systemTopic, JSON.stringify(output, null, 2));
	console.log(JSON.stringify(output, null, 2));
});

device.on('close', function() {
	var output = {
		clientID:deviceName,
		timestamp:new Date().toISOString(),
		status:'iot-closed',
		message:'AWS IoT closed'
	}
	device.publish(systemTopic, JSON.stringify(output, null, 2));
	console.log(JSON.stringify(output, null, 2));
});

device.on('reconnect', function() {
	var output = {
		clientID:deviceName,
		timestamp:new Date().toISOString(),
		status:'iot-reconnected',
		message:'AWS IoT reconnected'
	}
	device.publish(systemTopic, JSON.stringify(output, null, 2));
	console.log(JSON.stringify(output, null, 2));
});

device.on('offline', function() {
	var output = {
		clientID:deviceName,
		timestamp:new Date().toISOString(),
		status:'iot-offline',
		message:'AWS IoT offline'
	}
	device.publish(systemTopic, JSON.stringify(output, null, 2));
	console.log(JSON.stringify(output, null, 2));
});

device.on('error', function() {
	var output = {
		clientID:deviceName,
		timestamp:new Date().toISOString(),
		status:'iot-error',
		message:'AWS IoT error'
	}
	device.publish(systemTopic, JSON.stringify(output, null, 2));
	console.log(JSON.stringify(output, null, 2));
});


// Initialize the GrovePi System
board.init();

// Function for the "heartbeat" to be sent to AWS
function heartbeat() {
	var output = {
		clientID:deviceName,
		timestamp:new Date().toISOString(),
		status:'heartbeat',
		message:'System online'
	}
	device.publish(systemTopic, JSON.stringify(output, null, 2));
	if (debugEnabled == true) {
		console.log(JSON.stringify(output, null, 2));
	}
}

// Sends the "heartbeat" to AWS periodically, multiplying milliseconds to minutes
if (heartbeatEnabled == true) {
	setInterval(heartbeat, (heartbeatPeriod * 60000));
}

// Catches the ctrl+C event
process.on('SIGINT', onExit);

// Executes system shutdown when the Grove button is pressed
function initiateShutdown() {
	child = exec("sudo poweroff", function(error, stdout, stderr) {
		util.print('stdout: ' + stdout);
		util.print('stderr: ' + stderr);
		if (error !== null) {
			console.log('exec error: ' + error);
		}
	});
}
