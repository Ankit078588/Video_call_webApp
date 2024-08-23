const socket = io();

let localStream;
let remoteStream;
let peerConnection;
let isMicMuted = false;
let isVideoOff = false;
const rtcConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// Initialize the local video stream
const initialize = async () => {
    socket.on('signalingMessage', handleSignalingMessage);
    socket.on('secondUserJoined', handleSecondUserJoined);

    // Get the local video and audio stream
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    // Set the local video element's source to the local stream
    document.querySelector("#localVideo").srcObject = localStream;

    // Initiate the offer (only the first user will do this)
    if (window.location.href.indexOf('offer') === -1) {
        initiateOffer();
    }
};



const handleSecondUserJoined = () => {
    const audio = new Audio('/sounds/join-sound.mp3'); 
    audio.play();
};

const createPeerConnection = () => {
    peerConnection = new RTCPeerConnection(rtcConfig);

    remoteStream = new MediaStream();
    document.querySelector("#remoteVideo").srcObject = remoteStream;

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("signalingMessage", JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    };

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });
};

const initiateOffer = async () => {
    createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("signalingMessage", JSON.stringify({ type: "offer", offer }));
};

const handleSignalingMessage = async (message) => {
    const { type, offer, answer, candidate } = JSON.parse(message);

    if (type === "offer") {
        createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("signalingMessage", JSON.stringify({ type: "answer", answer }));
    }

    if (type === "answer") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    if (type === "candidate") {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
};



// Handle screen sharing
document.querySelector('.share-screen').addEventListener('click', async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
        });

        // Add screen tracks to the peer connection
        screenStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, screenStream);
        });

        // Display the screen share on the local user's screen
        const element = document.createElement('video');
        element.srcObject = screenStream;
        element.autoplay = true;
        element.id = "videoElement";
        document.getElementById('screenContainer').appendChild(element);

        // Apply CSS styles for remote + local videos
        const remoteVideo = document.getElementById('remoteVideo');
        remoteVideo.style.display = 'block';
        remoteVideo.style.position = 'fixed';
        remoteVideo.style.right = '20px';
        remoteVideo.style.width = '25%';
        remoteVideo.style.height = 'fit-content';

        const localVideo = document.getElementById('localVideo');
        localVideo.style.position = 'fixed';
        localVideo.style.bottom = '83px';
        localVideo.style.right = '20px';
        localVideo.style.width = '25%';

        // Stop screen share when the user stops sharing
        screenStream.getVideoTracks()[0].onended = () => {
            // Remove the screen share
            document.getElementById('videoElement').remove();
            
        };
    } catch (error) {
        console.error('Error sharing screen:', error);
    }
});





// Toggle microphone on/off
const toggleMic = () => {
    isMicMuted = !isMicMuted;
    localStream.getAudioTracks()[0].enabled = !isMicMuted;

    const micIcon = document.querySelector('.microphone-icon i');
    if (isMicMuted) {
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-microphone-slash');
    } else {
        micIcon.classList.remove('fa-microphone-slash');
        micIcon.classList.add('fa-microphone');
    }
};

// Toggle video on/off
const toggleVideo = () => {
    isVideoOff = !isVideoOff;
    localStream.getVideoTracks()[0].enabled = !isVideoOff;

    const videoIcon = document.querySelector('.video-icon i');
    if (isVideoOff) {
        videoIcon.classList.remove('fa-video');
        videoIcon.classList.add('fa-video-slash');
    } else {
        videoIcon.classList.remove('fa-video-slash');
        videoIcon.classList.add('fa-video');
    }
};

// Handle video/mic on & off
document.querySelector('.microphone-icon').addEventListener('click', toggleMic);
document.querySelector('.video-icon').addEventListener('click', toggleVideo);




// End the call
document.getElementById('end-call-button').addEventListener('click', () => {
    // Close the peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        console.log('Call ended');
    }

    // Stop the local video stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    // Stop the screen sharing stream if it's active
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        console.log('Screen sharing ended');
    }

    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
});

// Handle on user disconnected
socket.on('userDisconnected', () => {
    // Clear the remote video element
    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = null;  // Clear the video stream
    remoteVideo.style.background = "black";  // Optionally, set a black background
});


initialize();



// -----------------------------------------------------------------------------------
// Logics for sending messages


document.querySelector('.fa-message').addEventListener('click', () => {
    let chat_box = document.getElementById('chat_box');
    if (chat_box.style.right !== "20px") {
        chat_box.style.right = "20px";
    }
    else{
        chat_box.style.right = "-130%";
    }
});

document.querySelector('.fa-xmark').addEventListener('click', () => {
    let chat_box = document.getElementById('chat_box');
    chat_box.style.right = "-100%";
});


// Send message function
function sendMessage() {
    let text_box = document.getElementById('input_box');
    console.log(text_box.value);
    
    if (text_box.value) {
        // Create paragraph element for the sent message
        let p_sent = document.createElement('p');
        p_sent.innerHTML = text_box.value;
        p_sent.classList.add('sent_msg'); 
        
        // Create a div container for the sent message
        let div = document.createElement('div');
        div.classList.add('sent_msg_container'); 
        div.appendChild(p_sent);

        // Append the message container to the chat area
        let chat_area = document.getElementById('chat_area');
        chat_area.appendChild(div);

        // Emit the message via socket.io
        socket.emit('new_message', text_box.value);

        // Clear the input box
        text_box.value = '';
    }
}

// Handle sending message using click on send icon
document.querySelector('.send_btn').addEventListener('click', sendMessage);

// Handle sending message by using Enter key press on the input box
document.querySelector('#input_box').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});



socket.on('msg_from_server', function(msg) {
    let p = document.createElement('p');
    p.innerHTML = msg;
    p.classList.add('rcvd_msg');
    let chat_area = document.getElementById('chat_area');
    chat_area.appendChild(p);
})