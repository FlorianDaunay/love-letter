import Peer, { type DataConnection } from "peerjs";
import { CONNECT_TIMEOUT_MS } from "./config";

/** Registers a peer with the broker; rejects with the PeerJS error type (e.g. "unavailable-id"). */
export function openPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new Error("broker-timeout"));
    }, 12000);
    peer.once("open", () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.once("error", (err) => {
      clearTimeout(timer);
      peer.destroy();
      reject(new Error((err as { type?: string }).type ?? "peer-error"));
    });
  });
}

/**
 * Opens a data channel to `remoteId`. Fails fast when the broker reports the id unknown,
 * otherwise after a timeout.
 */
export function connectTo(peer: Peer, remoteId: string, timeoutMs = CONNECT_TIMEOUT_MS): Promise<DataConnection> {
  return new Promise((resolve, reject) => {
    const conn = peer.connect(remoteId, { reliable: true, serialization: "json" });
    let settled = false;
    const finish = (error: Error | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      peer.off("error", onPeerError);
      if (error) {
        conn.close();
        reject(error);
      } else resolve(conn);
    };
    const onPeerError = (err: { type?: string; message?: string }) => {
      if (err.type === "peer-unavailable" && (err.message ?? "").includes(remoteId)) finish(new Error("unavailable"));
    };
    const timer = setTimeout(() => finish(new Error("timeout")), timeoutMs);
    peer.on("error", onPeerError);
    conn.once("open", () => finish(null));
    conn.once("error", () => finish(new Error("conn-error")));
  });
}

export type { Peer, DataConnection };
