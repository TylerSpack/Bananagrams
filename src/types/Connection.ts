export default interface Connection {
    connection: RTCPeerConnection;
    dataChannel?: RTCDataChannel;
    ICEunsubscribe?: () => void;
}