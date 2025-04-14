"use client";

import { Device } from "mediasoup-client";
import React, { useRef, useState } from "react";
import { useSocket } from "../components/SocketProvider";
import { sfuSocket } from "../lib/socket";

export default function SFEVoiceTest2() {
  const [device, setDevice] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteAudioStreams, setRemoteAudioStreams] = useState([]);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState([]);

  const [sendTransport, setSendTransport] = useState(null);
  const [recvTransport, setRecvTransport] = useState(null);
  const [peers, setPeers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [videoProducer, setVideoProducer] = useState(null);
  const [audioProducer, setAudioProducer] = useState(null);
  const [screenProducer, setScreenProducer] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const localVideoRef = useRef(null);
  const recvTransportRef = useRef(null);
  const deviceRef = useRef(null);

  useSocket()

  const createDevice = async (rtpCapabilities) => {
    const newDevice = new Device();
    await newDevice.load({ routerRtpCapabilities: rtpCapabilities });
    setDevice(newDevice);
    deviceRef.current = newDevice;
    return newDevice;
  };

  const createSendTransport = (device, transportOptions) => {
    const newSendTransport = device.createSendTransport(transportOptions);
    newSendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
      try {
        sfuSocket.emit("connect-transport", {
          transportId: newSendTransport.id,
          dtlsParameters,
          roomId,
          peerId: sfuSocket.id,
        }, async (response) => {
          if(response.error) return console.log(response.error)
          callback()
        });
      } catch (error) {
        errback(error);
      }
    });

    newSendTransport.on(
      "produce",
      ({ kind, rtpParameters }, callback, errback) => {
        try {
          sfuSocket.emit(
            "produce",
            {
              transportId: newSendTransport.id,
              kind,
              rtpParameters,
              roomId,
              peerId: sfuSocket.id,
            },
            (response) => {
              callback({ id: response.producerId });
              setSendTransport(newSendTransport);
            }
          );
        } catch (error) {
          errback(error);
        }
      }
    );
    
    return newSendTransport;
  };

  const createRecvTransport = (device, transportOptions) => {
    const newRecvTransport = device.createRecvTransport(transportOptions);
    newRecvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
      try {
        sfuSocket.emit("connect-transport", {
          transportId: newRecvTransport.id,
          dtlsParameters,
          roomId,
          peerId: sfuSocket.id,
        }, async (response) => {
          if(response.error) return console.log(response.error)
          callback()
        });
      } catch (error) {
        errback(error);
      }
    });
    setRecvTransport(newRecvTransport);
    recvTransportRef.current = newRecvTransport;
    return newRecvTransport;
  };

  const getLocalAudioStreamAndTrack = async () => {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    const audioTrack = audioStream.getAudioTracks()[0];
    return audioTrack;
  };

  const joinRoom = () => {
    if (!sfuSocket || !roomId) return;
    if (window.confirm("join?")) {
      sfuSocket.emit(
        "join-room",
        { roomId, peerId: sfuSocket.id }, async (response) => {
          if (response.error) {
            console.error("Error joining room:", response.error);
            return;
          }
  
          const {
            sendTransportOptions,
            recvTransportOptions,
            rtpCapabilities,
            peerIds,
            existingProducers,
          } = response;
  
          // Device 생성 및 로드
          const newDevice = await createDevice(rtpCapabilities);
          // 송신용 Transport 생성
          const newSendTransport = createSendTransport(
            newDevice,
            sendTransportOptions
          );
  
          // 수신용 Transport 생성
          createRecvTransport(newDevice, recvTransportOptions);
  
          if(!newDevice.canProduce('audio')) console.log('no audio')
  
          sfuSocket.on("new-producer", handleNewProducer);
  
          // 오디오 스트림 캡처 및 Producer 생성
          const audioTrack = await getLocalAudioStreamAndTrack();
          const newAudioProducer = await newSendTransport.produce({
            track: audioTrack,
          });
          newAudioProducer.resume();
          setAudioProducer(newAudioProducer);
  
          // 기존 참여자 목록 업데이트
          setPeers(peerIds.filter((id) => id !== sfuSocket.id));
          sfuSocket.on("peer-left", ({ peerId }) => {
            setPeers((prevPeers) => prevPeers.filter((id) => id !== peerId));
            setRemoteAudioStreams(prev => prev.filter(stream => stream.peerId !== peerId))
            setRemoteVideoStreams(prev => prev.filter(stream => stream.peerId !== peerId))

          });

          for (const producerInfo of existingProducers) {
            const data = {producerId: producerInfo.id, ...producerInfo}
            await consume(data);
          }
  
          setJoined(true);
        }
      );
    }
  };

  const leaveRoom = () => {
    if (!sfuSocket) return;
    sfuSocket.off("new-producer");
    sfuSocket.emit("leave-room", (response) => {
      if (response && response.error) {
        console.error("Error leaving room:", response.error);
        return;
      }

      setJoined(false);
      setPeers([]);
      setRemoteAudioStreams([])
      setRemoteVideoStreams([])

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
      if (sendTransport) {
        sendTransport.close();
        setSendTransport(null);
      }
      if (recvTransport) {
        recvTransport.close();
        setRecvTransport(null);
      }
      if (device) {
        setDevice(null);
      }
    });
  };

  const handleNewProducer = async ({ producerId, peerId, kind }) => {
    await consume({ producerId, peerId, kind });
  };

  const consume = async ({ producerId, peerId }) => {
    const device = deviceRef.current;
    const recvTransport = recvTransportRef.current;
    if (!device || !recvTransport) {
      console.log("Device or RecvTransport not initialized");
      return;
    }

    sfuSocket.emit(
      "consume",
      {
        transportId: recvTransport?.id,
        producerId,
        roomId,
        peerId: sfuSocket.id,
        rtpCapabilities: device?.rtpCapabilities,
      }, async (response) => {
        if (response.error) return console.error("Error consuming:", response.error);
        
        const consumerData = response;
        const consumer = await recvTransport.consume({
          id: consumerData.id,
          producerId: consumerData.producerId,
          kind: consumerData.kind,
          rtpParameters: consumerData.rtpParameters,
        });
    
        consumer.resume();

        const remoteStream = new MediaStream();
        remoteStream.addTrack(consumer.track);
        
        if(consumer.track.kind === 'audio') setRemoteAudioStreams(prev => [...prev, {peerId, stream: remoteStream}])
        if(consumer.track.kind === 'video') setRemoteVideoStreams(prev => [...prev, {peerId, stream: remoteStream}])
        
        

        // if (consumer.kind === "video") {
        //   const videoElement = document.createElement("video");
        //   videoElement.srcObject = remoteStream;
        //   videoElement.autoplay = true;
        //   videoElement.playsInline = true;
        //   videoElement.width = 200;
        //   document.getElementById("remote-media")?.appendChild(videoElement);
        // } else if (consumer.kind === "audio") {
        //   const audioElement = document.createElement("audio");
        //   audioElement.srcObject = remoteStream;
        //   audioElement.autoplay = true;
        //   audioElement.controls = true;
        //   // const audio = new Audio();
        //   // audio.srcObject = remoteStream;
        //   // audio.play().catch((err) => console.warn("Autoplay error:", err));
        //   document.getElementById("remote-media")?.appendChild(audioElement);
  
        //   // 브라우저의 자동재생 정책을 우회하기 위해 재생 시도
        //   try {
        //     await audioElement.play();
        //   } catch (err) {
        //     console.error("Audio playback failed:", err);
        //   }
        // }
      }
    );
  };

  const startCamera = async () => {
    try {
      if (!sendTransport) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setLocalStream(stream);
  
      if (localVideoRef.current) {
        localVideoRef.current = stream;
      }
  
      const videoTrack = stream.getVideoTracks()[0];
  
      // 비디오 Producer 생성
      const newVideoProducer = await sendTransport.produce({ track: videoTrack });
      setVideoProducer(newVideoProducer);
    } catch (error) {
      console.log(error)
    }
  };

  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (localVideoRef.current) {
      localVideoRef.current = null;
    }
    if (videoProducer) {
      videoProducer.close();
      setVideoProducer(null);
    }
    if (audioProducer) {
      audioProducer.close();
      setAudioProducer(null);
    }
  }; 

  const startScreenShare = async () => {
    if (!sendTransport) return;

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
    });
    const screenTrack = stream.getVideoTracks()[0];

    const newScreenProducer = await sendTransport.produce({
      track: screenTrack,
    });
    setScreenProducer(newScreenProducer);

    screenTrack.onended = () => {
      stopScreenShare();
    };
  };

  const stopScreenShare = () => {
    if (screenProducer) {
      screenProducer.close();
      setScreenProducer(null);
    }
  };

  return (
    <div>
      <h1>Mediasoup</h1>
      <h2>My Id: {sfuSocket ? sfuSocket.id : "Not connected"}</h2>
      <h2>Room: {roomId || "none"}</h2>
      {!joined ? (
        <div>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId || ''}
            onChange={(event) => setRoomId(event.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div>
          <button onClick={leaveRoom}>Leave Room</button>
           <button onClick={localStream ? stopCamera : startCamera}>
            {localStream ? "Stop Camera" : "Start Camera"}
          </button>
          <button onClick={screenProducer ? stopScreenShare : startScreenShare}>
            {screenProducer ? "Stop Screen Share" : "Start Screen Share"}
          </button>
        </div>
      )}
      <div>
        <h2>Peers in Room</h2>
        <ul>
          {peers.map((peerId) => (
            <li key={peerId}>{peerId}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Remote Media</h2>
        <div id="remote-media"></div>
        {remoteAudioStreams.map(data => 
          <>
            {data.peerId}
            <audio 
              ref={
                audio => {
                  if(audio) {
                    audio.srcObject = data.stream
                    audio.volume = 1
                  }
                }
              } 
              autoPlay 
              muted={false}
              controls
            />
          </>
        )}
        {remoteVideoStreams.map(data => 
          <>
            {data.peerId}
            <video 
              ref={
                audio => {
                  if(audio) {
                    audio.srcObject = data.stream
                    audio.volume = 1
                  }
                }
              } 
              autoPlay 
              muted={false}
              controls
            />
          </>
        )}
      </div>
    </div>
  );
}
