const socket = new WebSocket(`ws://${window.location.host}/zoom`);

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

//call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getCameras(){
	try{
		const devices = await navigator.mediaDevices.enumerateDevices();
		const cameras = devices.filter(device => device.kind == "videoinput");
		const currentCamera = myStream.getVideoTracks()[0];
		console.log(cameras)
		myStream.getVideoTracks();
		cameras.forEach(camera => {
			const option = document.createElement("option");
			option.value = camera.deviceId;
			option.innerText = camera.label;
			if(currentCamera.label == camera.label){
				option.selected = true;
			}
			camerasSelect.appendChild(option);
		})
		console.log(devices)
	}catch(e){
		console.log(e);
	}
}

async function getMedia(deviceId){
	const initialConstraints = {
		audio : true,
		video: { facingMode : "user"}
	};
	
	const cameraConstraints = {
		audio: true,
		video: {deviceId: { exact: deviceId }}
	}
	try{
		myStream = await navigator.mediaDevices.getUserMedia(
			deviceId ? cameraConstraints : initialConstraints
		);
		myFace.srcObject = myStream;
		if(!deviceId){
			await getCameras();
		}
	} catch(e){
		console.log(e);
	}
}

getMedia();

function handleMuteClick(){
	myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
	if(!muted){
		muteBtn.innerText = "Unmute";
		muted = true;
	}else{
		muteBtn.innerText = "Mute";
		muted = false;
	}
}

function handleCameraClick(){
	myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
	if(cameraOff){
		cameraBtn.innerText = "Turn Camera Off";
		cameraOff = false;
	}else{
		cameraBtn.innerText = "Turn Camera On";
		cameraOff = true;
	}
	
}

async function handleCameraChange(){
	await getMedia(camerasSelect.value)
	if(myPeerConnection){
		const videoTrack = myStream.getVideoTracks()[0];
		const videoSender = myPeerConnection.getSenders().find(sender => sender.track.kind == "video")
		videoSender.replaceTrack();		
	}
}

muteBtn.addEventListener('click', handleMuteClick);
cameraBtn.addEventListener('click', handleCameraClick);
camerasSelect.addEventListener('input', handleCameraChange);

// Welcome Form (join a room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");


async function initCall(){
	welcome.hidden = true;
	call.hidden = false;
	await getMedia();
	makeConnection();
}

async function handlewelcomeSubmit(event){
	console.log("click enter_room")
	event.preventDefault();
	const input = welcomeForm.querySelector("input");
	await initCall();
	//socket.emit("join_room", input.value);
	socket.send(makeMessage("join", input.value));
	roomName = input.value;
	input.value = "";
}
welcomeForm.addEventListener('submit', handlewelcomeSubmit);
// Socket Code

// 방에 참가하면 실행되는 코드
/*socket.on("welcome", async() => {
	myDataChannel = myPeerConnection.createDataChannel("chat");
	myDataChannel.addEventListener("message", console.log)
	console.log("made data channel");
	const offer = await myPeerConnection.createOffer();
	myPeerConnection.setLocalDescription(offer);
	console.log("sent the offer")
	console.log(offer)
	//socket.emit("offer", offer, roomName);
	
})*/

socket.addEventListener("open", () =>{
	console.log("open")
})

socket.addEventListener("message", async(data) =>{ 
	console.log("message", data)
	console.log("message.type", data.data.type)
	switch(data.type){
		case "join":
			console.log("join")
			myDataChannel = myPeerConnection.createDataChannel("chat");
			myDataChannel.addEventListener("message", console.log)
			console.log("made data channel");
			console.log(myDataChannel);
			const offer = await myPeerConnection.createOffer();
			myPeerConnection.setLocalDescription(offer);
			console.log("sent the offer")
			console.log(offer)
			socket.send(makeMessage("offer", roomName))
			break;
		case "offer":
			myPeerConnection.addEventListener("datachannel", (event) => {
				myDataChannel = event.channel;
				myDataChannel.addEventListener("message", (event) => console.log)
			})
			console.log("received the answer")
			myPeerConnection.setRemoteDescription(offer);
			const answer = await myPeerConnection.createAnswer();
			myPeerConnection.setLocalDescription(answer);
			console.log("sent the answer")
			break;
		case "answer":
			console.log("received the answer")
			myPeerConnection.setRemoteDescription(answer);
			break;
		case "ice":
			console.log("received ice candidate")
			myPeerConnection.addIceCandidate(ice);
			break;
	}


})

/*socket.on("offer", async(offer) => {
	myPeerConnection.addEventListener("datachannel", (event) => {
		myDataChannel = event.channel;
		myDataChannel.addEventListener("message", (event) => console.log)
	})
	console.log("received the answer")
	myPeerConnection.setRemoteDescription(offer);
	const answer = await myPeerConnection.createAnswer();
	myPeerConnection.setLocalDescription(answer);
	console.log("sent the answer")
	//socket.emit("answer", answer);
	
})
*/
socket.addEventListener("message", async() =>{ // offer
	myPeerConnection.addEventListener("datachannel", (event) => {
		myDataChannel = event.channel;
		myDataChannel.addEventListener("message", (event) => console.log)
	})
	console.log("received the answer")
	myPeerConnection.setRemoteDescription(offer);
	//const answer = await myPeerConnection.createAnswer();
	myPeerConnection.setLocalDescription(answer);
	console.log("sent the answer")
	
})

/*socket.on("answer", answer => {
	console.log("received the answer")
	myPeerConnection.setRemoteDescription(answer);
})
*/
socket.addEventListener("message", async() =>{ // answer
	console.log("received the answer")
	myPeerConnection.setRemoteDescription(answer);
	
})

/*socket.on("ice",ice => {
	console.log("received ice candidate")
	myPeerConnection.addIceCandidate(ice);
})
*/
socket.addEventListener("message", async(ice) =>{ // ice
	console.log("received ice candidate")
	myPeerConnection.addIceCandidate(ice);
})


// RTC Code

function makeConnection(){
	myPeerConnection = new RTCPeerConnection();
	myPeerConnection.addEventListener("icecandidate", handleIce);
	myPeerConnection.addEventListener("addstream", handleAddStream);
	myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data){
	console.log("sent ice candidate")
	//socket.emit("ice", data.candidate, roomName);
	socket.send(makeMessage("ice", { candidate : data.candidate, roomName}));
}

function handleAddStream(data){
	console.log("got an event from my peer");
	const peerFace = document.getElementById("peerFace");
	peerFace.srcObject = data.stream
}


// return JSON

function makeMessage(type, payload){
	const msg = { type : type, payload: payload };
	return JSON.stringify(msg);
}














