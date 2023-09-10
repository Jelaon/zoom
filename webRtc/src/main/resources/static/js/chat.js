const socket = new WebSocket(`ws://${window.location.host}/zoom`);

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const displaySurfaceInput = document.getElementById("displaySurface");
const call = document.getElementById("call");
const controlDiv = document.getElementById("controlDiv");
const myStreamDiv = document.getElementById("myStream");
const notificationDiv = document.getElementById("notificationDiv");
const notification = document.getElementById("notification");
const rooms = document.getElementById("rooms");
const existRoomList = document.getElementById("existRoomList");

let user = {
	sessionId : "",
	nickName : "",
	roomName : "",
}

let userList = [];

call.style.display = 'none';
controlDiv.style.display = 'none';

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;
let nickName;
let peerNick;

async function getCameras() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const cameras = devices.filter(device => device.kind == "videoinput");
		const currentCamera = myStream.getVideoTracks()[0];
		myStream.getVideoTracks();
		cameras.forEach(camera => {
			const option = document.createElement("option");
			option.value = camera.deviceId;
			option.innerText = camera.label;
			if (currentCamera.label == camera.label) {
				option.selected = true;
			}
			camerasSelect.appendChild(option);
		})
	} catch (e) {
		console.log(e);
	}
}

async function getMedia(deviceId) {
	const initialConstraints = {
		audio: true,
		video: { facingMode: "user" }
	};

	const cameraConstraints = {
		audio: true,
		video: { deviceId: { exact: deviceId } }
	}
	try {
		myStream = await navigator.mediaDevices.getUserMedia(
			deviceId ? cameraConstraints : initialConstraints
		);
		myFace.srcObject = myStream;
		if (!deviceId) {
			await getCameras();
		}
	} catch (e) {
		console.log(e);
	}
}

function handleMuteClick() {
	myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
	if (!muted) {
		muteBtn.innerText = "Unmute";
		muted = true;
	} else {
		muteBtn.innerText = "Mute";
		muted = false;
	}
}

function handleCameraClick() {
	myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
	if (cameraOff) {
		cameraBtn.innerText = "Turn Camera Off";
		cameraOff = false;
	} else {
		cameraBtn.innerText = "Turn Camera On";
		cameraOff = true;
	}
}

async function handleCameraChange() {
	await getMedia(camerasSelect.value)
	if (myPeerConnection) {
		const videoTrack = myStream.getVideoTracks()[0];
		const videoSender = myPeerConnection.getSenders().find(sender => sender.track.kind == "video")
		videoSender.replaceTrack(videoTrack);
	}
}
async function handleScreenChange() {
	await getMedia(displaySurfaceInput.value)
	if (myPeerConnection) {
		videoTrack = myStream.getVideoTracks()[0];
		videoSender = myPeerConnection.getSenders().find(sender => sender.track.kind == "video")
		videoSender.replaceTrack(videoTrack);
	}
}


muteBtn.addEventListener('click', handleMuteClick);
cameraBtn.addEventListener('click', handleCameraClick);
camerasSelect.addEventListener('input', handleCameraChange);
displaySurfaceInput.addEventListener('input', handleScreenChange);

// Welcome Form (join a room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
	welcome.style.display = 'none';
	call.style.display = 'block';
	controlDiv.style.display = 'flex';
	await getMedia();
	makeConnection();
}

async function handlewelcomeSubmit(event) {
	getMedia();
	event.preventDefault();
	const input = welcomeForm.querySelector("input");
	await initCall();
	userList[0].nickName = document.getElementById('nickName').value;
	userList[0].roomName = input.value;
	socket.send(makeMessage("join", userList[0], ""));
	input.value = "";
}
welcomeForm.addEventListener('submit', handlewelcomeSubmit);

// Socket Code

socket.addEventListener("message", async (data) => {
	data = JSON.parse(data.data)
	switch (data.type) {
		case "save":
			userList.push({sessionId : data.sessionId})
			break;
		case "join":
			//myDataChannel = myPeerConnection.createDataChannel("chat");
			//myDataChannel.addEventListener("message", console.log);
			const offer = await myPeerConnection.createOffer();
			myPeerConnection.setLocalDescription(offer);
			peerId = data.user.sessionId;
			socket.send(makeMessage("offer", userList[0] , peerId, offer ))
			break;
		case "leave":
			document.getElementById('peerFace').remove();
			for(let i = 0; i < userList.length; i++){
				if(userList[i].sessionId == data.sessionId){
					notice( userList[i].nickName + "님이 퇴장하였습니다.")
					userList.splice(i,1);
					break;
				}
			}
			
		case "offer":
			//myPeerConnection.addEventListener("datachannel", (event) => {
			//	myDataChannel = event.channel;
			//	myDataChannel.addEventListener("message", (event) => console.log)
			//})
			myPeerConnection.setRemoteDescription(data.sdp);
			const answer = await myPeerConnection.createAnswer();
			myPeerConnection.setLocalDescription(answer);
			userList.push(data.user);
			peerId = data.user.sessionId;
			socket.send(makeMessage("answer", userList[0] , peerId, answer ))
			peerNick = data.user.nickName;
			break;
		case "answer":
			//peerNick = data.payload.
			myPeerConnection.setRemoteDescription(data.sdp);
			userList.push(data.user);
			notice(userList[userList.length -1].nickName + "님이 입장하였습니다.")
			break;
		case "ice":
			ice = data.sdp;
			myPeerConnection.addIceCandidate(ice);
			break;
	}
})

// RTC Code

function makeConnection() {
	myPeerConnection = new RTCPeerConnection();
	myPeerConnection.addEventListener("icecandidate", handleIce);
	myPeerConnection.addEventListener("addstream", handleAddStream);
	myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
	//socket.emit("ice", data.candidate, roomName);
	candidate = data.candidate;
	peerId = userList[userList.length -1].sessionId
	socket.send(makeMessage("ice", "", peerId, candidate));
}

function handleAddStream(data) {
	const peerFace = document.createElement("video");
	myStreamDiv.appendChild(peerFace);
	peerFace.setAttribute('id', 'peerFace');
	peerFace.setAttribute('autoplay', true);
	peerFace.setAttribute('playsinline', true);
	peerFace.srcObject = data.stream;
}

// return JSON

function makeMessage(type, user, peerId, sdp) {
	const msg = { type: type, user: user, peerId : peerId, sdp : sdp};
	return JSON.stringify(msg);
}

function notice(text) {
	notification.innerText = text;
	notificationDiv.style.opacity = 1
	setTimeout(() => notificationDiv.style.opacity = 0, 3000);
}

document.getElementById('leave').addEventListener('click', ()=>{
	location.reload();
})

function refresh() {
	$.ajax({
		url: "roomList",
		dataType: 'json',
		success: function(data) {
			while (rooms.firstChild) {
				rooms.firstChild.remove()
			}
			
			Object.keys(data).forEach(function(existRooms) {
				const newRow = rooms.insertRow();
				const newCell1 = newRow.insertCell(0);
				const newCell2 = newRow.insertCell(1);
				newCell1.innerText = existRooms;
				newCell2.innerText = data[existRooms];
			})
		}
	});
} refresh();

document.getElementById('refresh').addEventListener('click', refresh);



/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
'use strict';

const preferredDisplaySurface = document.getElementById('displaySurface');
const startButton = document.getElementById('startButton');
document.getElementById('options').hidden = true;

if (adapter.browserDetails.browser === 'chrome' &&
    adapter.browserDetails.version >= 107) {
  // See https://developer.chrome.com/docs/web-platform/screen-sharing-controls/
  //document.getElementById('options').style.display = 'block';
} else if (adapter.browserDetails.browser === 'firefox') {
  // Polyfill in Firefox.
  // See https://blog.mozilla.org/webrtc/getdisplaymedia-now-available-in-adapter-js/
  adapter.browserShim.shimGetDisplayMedia(window, 'screen');
}

function handleSuccess(stream) {
  startButton.disabled = true;
  preferredDisplaySurface.disabled = true;
  myFace.srcObject = stream;
	console.log(stream)
  // demonstrates how to detect that the user has stopped
  // sharing the screen via the browser UI.
  stream.getVideoTracks()[0].addEventListener('ended', () => {
    errorMsg('The user has ended sharing the screen');
    startButton.disabled = false;
    preferredDisplaySurface.disabled = false;
  });
}

function handleError(error) {
  errorMsg(`getDisplayMedia error: ${error.name}`, error);
}

function errorMsg(msg, error) {
  const errorElement = document.querySelector('#errorMsg');
  errorElement.innerHTML += `<p>${msg}</p>`;
  if (typeof error !== 'undefined') {
    console.error(error);
  }
}


startButton.addEventListener('click', () => {
  const options = {audio: true, video: true};
  const displaySurface = preferredDisplaySurface.options[preferredDisplaySurface.selectedIndex].value;
  if (displaySurface !== 'default') {
    options.video = {displaySurface};
  }
  navigator.mediaDevices.getDisplayMedia(options)
      .then(handleSuccess, handleError);
});

if ((navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)) {
  startButton.disabled = false;
} else {
  errorMsg('getDisplayMedia is not supported');
}

(function(i, s, o, g, r, a, m) {
i['GoogleAnalyticsObject']=r; i[r]=i[r]||function() {
  (i[r].q=i[r].q||[]).push(arguments);
}, i[r].l=1*new Date(); a=s.createElement(o),
  m=s.getElementsByTagName(o)[0]; a.async=1; a.src=g; m.parentNode.insertBefore(a, m);
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-48530561-1', 'auto');
ga('send', 'pageview');




