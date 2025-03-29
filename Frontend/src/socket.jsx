import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
  HStack,
  Divider,
  Grid,
  GridItem,
  useToast,
} from "@chakra-ui/react";
import io from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const url =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

const socket = io(url, {
  transports: ["websocket"], // Prefer WebSocket for lower latency
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  withCredentials: true,
});

const VideoChat = () => {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const toast = useToast();

  useEffect(() => {
    const pc = peerConnections.current;

    socket.on("user-joined", async (userId) => {
      if (!pc[userId]) {
        pc[userId] = createPeerConnection(userId);
      } else if (pc[userId].signalingState !== "stable") {
        console.warn(`Peer connection with ${userId} already in progress.`);
        return;
      }
      try {
        const offer = await pc[userId].createOffer();
        await pc[userId].setLocalDescription(offer);
        socket.emit("offer", { roomId, offer, sender: socket.id });
      } catch (err) {
        console.error("Error creating offer:", err);
      }
    });

    socket.on("existing-users", async (users) => {
      for (const userId of users) {
        if (!pc[userId]) {
          pc[userId] = createPeerConnection(userId);
        } else if (pc[userId].signalingState !== "stable") {
          console.warn(`Peer connection with ${userId} already in progress.`);
          continue;
        }
        try {
          const offer = await pc[userId].createOffer();
          await pc[userId].setLocalDescription(offer);
          socket.emit("offer", { roomId, offer, sender: socket.id });
        } catch (err) {
          console.error("Error creating offer for existing user:", err);
        }
      }
    });

    socket.on("offer", async ({ sender, offer }) => {
      if (!pc[sender]) {
        pc[sender] = createPeerConnection(sender);
      }
      try {
        if (pc[sender].signalingState === "stable") {
          await pc[sender].setRemoteDescription(
            new RTCSessionDescription(offer)
          );
          const answer = await pc[sender].createAnswer();
          await pc[sender].setLocalDescription(answer);
          socket.emit("answer", { roomId, answer, sender: socket.id });
        } else {
          console.warn(
            `Ignoring offer from ${sender} in state: ${pc[sender].signalingState}`
          );
        }
      } catch (err) {
        console.error("Error handling offer:", err);
      }
    });

    socket.on("answer", async ({ sender, answer }) => {
      if (pc[sender]) {
        try {
          const currentState = pc[sender].signalingState;
          if (currentState === "have-local-offer") {
            await pc[sender].setRemoteDescription(
              new RTCSessionDescription(answer)
            );
          } else {
            console.warn(`Cannot set remote answer in state: ${currentState}`);
          }
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }
    });

    socket.on("ice-candidate", async ({ sender, candidate }) => {
      if (pc[sender]) {
        try {
          if (pc[sender].remoteDescription) {
            await pc[sender].addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pc[sender].iceCandidateBuffer.push(candidate);
          }
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    socket.on("user-left", (userId) => {
      if (pc[userId]) {
        pc[userId].close();
        delete pc[userId];
      }
      setRemoteStreams((prev) => prev.filter((stream) => stream.id !== userId));
      toast({
        title: "Participant left",
        description: `User ${userId.substring(0, 5)}... has left`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    });

    return () => {
      Object.values(pc).forEach((connection) => connection.close());
      socket.off("user-joined");
      socket.off("existing-users");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-left");
    };
  }, [roomId]);

  const startVideoStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Media Error",
        description: "Could not access camera or microphone.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const createPeerConnection = (userId) => {
    if (peerConnections.current[userId]) return peerConnections.current[userId];

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // Add a TURN server for production reliability (example):
        // {
        //   urls: "turn:your-turn-server.com:3478",
        //   username: "your-username",
        //   credential: "your-password",
        // },
      ],
    });

    peerConnection.iceCandidateBuffer = []; // Buffer for ICE candidates

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
          sender: socket.id,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((prevStreams) => {
        const existingStream = prevStreams.find((s) => s.id === userId);
        if (!existingStream) {
          return [...prevStreams, { id: userId, stream: event.streams[0] }];
        }
        return prevStreams.map((stream) =>
          stream.id === userId
            ? { ...stream, stream: event.streams[0] }
            : stream
        );
      });
    };

    // Apply buffered ICE candidates after setting remote description
    const originalSetRemoteDescription = peerConnection.setRemoteDescription;
    peerConnection.setRemoteDescription = async function (description) {
      await originalSetRemoteDescription.apply(this, [description]);
      while (this.iceCandidateBuffer.length) {
        await this.addIceCandidate(
          new RTCIceCandidate(this.iceCandidateBuffer.shift())
        );
      }
    };

    peerConnections.current[userId] = peerConnection;
    return peerConnection;
  };

  const createRoom = async () => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    socket.emit("create-room", newRoomId);
    setJoined(true);
    await startVideoStream();
    socket.emit("join-room", newRoomId);
  };

  const joinRoom = async () => {
    if (roomId.trim()) {
      setJoined(true);
      await startVideoStream();
      socket.emit("join-room", roomId);
    }
  };

  const leaveRoom = () => {
    try {
      Object.values(peerConnections.current).forEach((connection) => {
        connection.close();
      });
      peerConnections.current = {};

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      socket.emit("leave-room", roomId);

      setRemoteStreams([]);
      setJoined(false);
      setRoomId("");

      toast({
        title: "Left room",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error("Error leaving room:", err);
      toast({
        title: "Error leaving room",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      {!joined ? (
        <Box
          maxW="md"
          mx="auto"
          bg="white"
          borderRadius="xl"
          boxShadow="md"
          p={8}
        >
          <VStack spacing={6} align="stretch">
            <Heading as="h1" size="xl" textAlign="center" color="blue.600">
              Video Chat
            </Heading>

            <VStack spacing={4}>
              <Button
                onClick={createRoom}
                colorScheme="blue"
                size="lg"
                width="full"
              >
                Create New Room
              </Button>

              <HStack w="full">
                <Divider borderColor="gray.300" />
                <Text fontSize="sm" color="gray.500">
                  OR
                </Text>
                <Divider borderColor="gray.300" />
              </HStack>

              <VStack spacing={4} w="full">
                <Input
                  placeholder="Enter Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  size="lg"
                  focusBorderColor="blue.500"
                />
                <Button
                  onClick={joinRoom}
                  colorScheme="green"
                  size="lg"
                  width="full"
                  isDisabled={!roomId.trim()}
                >
                  Join Room
                </Button>
              </VStack>
            </VStack>
          </VStack>
        </Box>
      ) : (
        <Box maxW="6xl" mx="auto">
          <Flex
            justify="space-between"
            align="center"
            bg="white"
            borderRadius="xl"
            boxShadow="md"
            p={6}
            mb={6}
          >
            <Box>
              <Heading as="h2" size="md" mb={2}>
                Room:{" "}
                <Text as="span" fontFamily="mono" color="blue.500">
                  {roomId}
                </Text>
              </Heading>
              <Text color="gray.600">
                {remoteStreams.length + 1} participant
                {remoteStreams.length !== 1 ? "s" : ""} connected
              </Text>
            </Box>
            <Button
              onClick={leaveRoom}
              colorScheme="red"
              variant="outline"
              size="sm"
            >
              Leave Room
            </Button>
          </Flex>

          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            }}
            gap={4}
          >
            <GridItem>
              <Box
                bg="white"
                borderRadius="xl"
                boxShadow="md"
                overflow="hidden"
              >
                <Box bg="blue.50" p={2}>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="blue.700"
                    textAlign="center"
                  >
                    You
                  </Text>
                </Box>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", aspectRatio: "16/9" }}
                />
              </Box>
            </GridItem>

            {remoteStreams.map(({ id, stream }) => (
              <GridItem key={id}>
                <Box
                  bg="white"
                  borderRadius="xl"
                  boxShadow="md"
                  overflow="hidden"
                >
                  <Box bg="red.50" p={2}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="red.700"
                      textAlign="center"
                      isTruncated
                    >
                      User: {id.substring(0, 8)}...
                    </Text>
                  </Box>
                  <video
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (el) el.srcObject = stream;
                    }}
                    style={{ width: "100%", aspectRatio: "16/9" }}
                  />
                </Box>
              </GridItem>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default VideoChat;
