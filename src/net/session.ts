import { applyAction, chooseBotAction, createGame, MAX_PLAYERS, MIN_PLAYERS, type GameAction, type GameState } from "@/core/game";
import { randomSeed } from "@/core/rng";
import {
  AUTOPILOT_DELAY_MS,
  BOT_DELAY_MS,
  CHAT_LIMIT,
  HEARTBEAT_MS,
  MAX_EPOCH_PROBE,
  MIGRATION_ATTEMPT_MS,
  MIGRATION_GRACE_MS,
  PEER_TIMEOUT_MS,
  hostPeerId,
  randomCode,
} from "./config";
import { hashPassword } from "./crypto";
import { connectTo, openPeer, type DataConnection, type Peer } from "./peer";
import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type HostMessage,
  type LobbyPlayer,
  type RejectReason,
  type RoomSnapshot,
} from "./protocol";

export type SessionStatus = "connecting" | "open" | "migrating" | "closed";

export interface SessionView {
  status: SessionStatus;
  room: RoomSnapshot | null;
  myId: string;
  isHost: boolean;
  offline: boolean;
  /** i18n key explaining why the session closed. */
  closeReason: string | null;
}

export interface Profile {
  playerId: string;
  name: string;
}

interface HostOptions {
  profile: Profile;
  password?: string;
  /** Solo against bots, no network at all. */
  offline?: boolean;
  /** Resume a saved game. */
  resume?: GameState;
  /** Keep a given code (resume). */
  code?: string;
}

interface Client {
  conn: DataConnection;
  playerId: string;
  lastSeen: number;
}

const FATAL: RejectReason[] = ["password", "kicked", "full", "started", "version"];
const BOT_NAMES = ["Odette", "Gaspard", "Isaure", "Tristan", "Mahaut", "Aymeric", "Blanche", "Enguerrand"];

let botCounter = 0;
const uid = () => Math.random().toString(36).slice(2, 10);

export class Session {
  private listeners = new Set<(view: SessionView) => void>();
  private errorListeners = new Set<(error: string) => void>();
  room: RoomSnapshot | null = null;
  myId: string;
  private role: "host" | "client" = "client";
  private status: SessionStatus = "connecting";
  private closeReason: string | null = null;
  private offline = false;
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private clients = new Map<DataConnection, Client>();
  private lastHostSeen = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private disconnectedAt = new Map<string, number>();
  private graceUntil = 0;
  private passwordHash: string | null = null;
  private busy = false;

  private constructor(private profile: Profile) {
    this.myId = profile.playerId;
  }

  // ---------------------------------------------------------------- lifecycle

  static async host(options: HostOptions): Promise<Session> {
    const session = new Session(options.profile);
    session.role = "host";
    session.offline = !!options.offline;
    const code = options.code ?? randomCode();
    session.passwordHash = await hashPassword(code, options.password ?? "");
    const lobby: LobbyPlayer[] = options.resume
      ? options.resume.players.map((p) => ({ id: p.id, name: p.name, isBot: p.isBot, connected: p.isBot }))
      : [{ id: options.profile.playerId, name: options.profile.name, isBot: false, connected: true }];
    if (options.resume) {
      // Take back my seat: same id, else same name, else the first human seat.
      const seat =
        lobby.find((p) => p.id === options.profile.playerId) ??
        lobby.find((p) => !p.isBot && p.name === options.profile.name) ??
        lobby.find((p) => !p.isBot)!;
      seat.connected = true;
      seat.name = options.profile.name;
      session.myId = seat.id;
    }
    session.room = {
      code,
      epoch: 0,
      hostId: session.myId,
      passwordHash: session.passwordHash,
      settings: { maxPlayers: MAX_PLAYERS },
      lobby,
      game: options.resume ? structuredClone(options.resume) : null,
      chat: [],
    };
    if (session.room.game) {
      for (const p of session.room.game.players) if (p.id === session.myId) p.name = options.profile.name;
      session.room.game.updatedAt = Date.now();
    }
    if (!session.offline) {
      session.peer = await openPeer(hostPeerId(code, 0));
      session.listenAsHost();
    }
    session.status = "open";
    session.startTicking();
    session.notify();
    return session;
  }

  static async join(code: string, password: string, profile: Profile): Promise<Session> {
    const session = new Session(profile);
    session.passwordHash = await hashPassword(code, password);
    session.peer = await openPeer();
    let lastError = "notFound";
    for (let epoch = 0; epoch <= MAX_EPOCH_PROBE; epoch++) {
      let conn: DataConnection;
      try {
        conn = await connectTo(session.peer, hostPeerId(code, epoch), 5000);
      } catch (error) {
        if ((error as Error).message === "timeout") lastError = "timeout";
        continue;
      }
      const result = await session.handshake(conn);
      if (result === "ok") {
        session.status = "open";
        session.startTicking();
        session.notify();
        return session;
      }
      session.destroyPeer();
      throw new Error(`reject.${result}`);
    }
    session.destroyPeer();
    throw new Error(`join.${lastError}`);
  }

  subscribe(listener: (view: SessionView) => void): () => void {
    this.listeners.add(listener);
    listener(this.view());
    return () => this.listeners.delete(listener);
  }

  onError(listener: (error: string) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  view(): SessionView {
    return {
      status: this.status,
      room: this.room,
      myId: this.myId,
      isHost: this.role === "host",
      offline: this.offline,
      closeReason: this.closeReason,
    };
  }

  isClosed() {
    return this.status === "closed";
  }

  /** Leaves on purpose: as a client, tell the host; as host, the others migrate right away. */
  leave() {
    if (this.isClosed()) return;
    if (this.role === "client") this.send({ t: "leave" });
    this.close("closed.left");
  }

  private close(reason: string) {
    if (this.isClosed()) return;
    this.status = "closed";
    this.closeReason = reason;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // Give a queued "leave" a moment to go out.
    setTimeout(() => this.destroyPeer(), 150);
    this.notify();
  }

  private destroyPeer() {
    try {
      this.peer?.destroy();
    } catch {
      /* already gone */
    }
    this.peer = null;
    this.hostConn = null;
    this.clients.clear();
  }

  private notify() {
    const view = this.view();
    for (const l of this.listeners) l(view);
  }

  private fail(error: string) {
    for (const l of this.errorListeners) l(error);
  }

  private startTicking() {
    if (this.timer) clearInterval(this.timer);
    this.lastHostSeen = Date.now();
    this.timer = setInterval(() => this.tick(), HEARTBEAT_MS / 2);
  }

  private tickCount = 0;
  private tick() {
    if (this.isClosed()) return;
    const beat = this.tickCount++ % 2 === 0;
    if (this.role === "host") this.hostTick(beat);
    else if (this.status === "open") {
      if (beat) this.send({ t: "ping" });
      if (Date.now() - this.lastHostSeen > PEER_TIMEOUT_MS) void this.migrate();
    }
  }

  // ---------------------------------------------------------------- player API

  dispatch(action: GameAction) {
    if (this.role === "client") return this.send({ t: "action", action });
    this.applyAs(this.myId, action);
  }

  chat(text: string) {
    const clean = text.trim().slice(0, 300);
    if (!clean) return;
    if (this.role === "client") return this.send({ t: "chat", text: clean });
    this.pushChat(this.myId, clean);
  }

  // ---------------------------------------------------------------- host API

  addBot() {
    const room = this.room;
    if (this.role !== "host" || !room || room.game || room.lobby.length >= room.settings.maxPlayers) return;
    const used = new Set(room.lobby.map((p) => p.name));
    const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${++botCounter}`;
    room.lobby.push({ id: `bot-${uid()}`, name, isBot: true, connected: true });
    this.broadcast();
  }

  removePlayer(id: string) {
    const room = this.room;
    if (this.role !== "host" || !room || room.game || id === this.myId) return;
    for (const [conn, client] of this.clients) {
      if (client.playerId === id) {
        this.sendTo(conn, { t: "reject", reason: "kicked" });
        setTimeout(() => conn.close(), 200);
        this.clients.delete(conn);
      }
    }
    room.lobby = room.lobby.filter((p) => p.id !== id);
    this.broadcast();
  }

  startGame() {
    const room = this.room;
    if (this.role !== "host" || !room || room.game) return;
    const seated = room.lobby.filter((p) => p.isBot || p.connected);
    if (seated.length < MIN_PLAYERS || seated.length > MAX_PLAYERS) return;
    room.lobby = seated;
    room.game = createGame(seated, randomSeed(), Date.now());
    this.broadcast();
  }

  backToLobby() {
    const room = this.room;
    if (this.role !== "host" || !room) return;
    room.game = null;
    this.broadcast();
  }

  // ---------------------------------------------------------------- host internals

  private listenAsHost() {
    this.peer?.on("connection", (conn) => {
      conn.on("data", (data) => this.onClientMessage(conn, data as ClientMessage));
      conn.on("close", () => this.dropClient(conn));
      conn.on("error", () => this.dropClient(conn));
    });
    this.peer?.on("disconnected", () => {
      // Lost the broker: existing channels keep working, but new joins need it back.
      if (!this.isClosed()) this.peer?.reconnect();
    });
  }

  private dropClient(conn: DataConnection) {
    const client = this.clients.get(conn);
    this.clients.delete(conn);
    if (!client || !this.room) return;
    // The same player may already have reconnected on another channel.
    if ([...this.clients.values()].some((c) => c.playerId === client.playerId)) return;
    this.setConnected(client.playerId, false);
    this.broadcast();
  }

  private setConnected(playerId: string, connected: boolean) {
    const seat = this.room?.lobby.find((p) => p.id === playerId);
    if (!seat || seat.isBot) return;
    seat.connected = connected;
    if (connected) this.disconnectedAt.delete(playerId);
    else this.disconnectedAt.set(playerId, Date.now());
  }

  private onClientMessage(conn: DataConnection, msg: ClientMessage) {
    const room = this.room;
    if (!room || !msg || typeof msg !== "object") return;
    const client = this.clients.get(conn);
    if (client) client.lastSeen = Date.now();

    if (msg.t === "hello") return this.onHello(conn, msg);
    if (!client) return;
    switch (msg.t) {
      case "action":
        this.applyAs(client.playerId, msg.action, conn);
        break;
      case "chat":
        if (typeof msg.text === "string") this.pushChat(client.playerId, msg.text.trim().slice(0, 300));
        break;
      case "leave":
        this.clients.delete(conn);
        this.setConnected(client.playerId, false);
        if (!room.game) room.lobby = room.lobby.filter((p) => p.id !== client.playerId);
        conn.close();
        this.broadcast();
        break;
      case "ping":
        break;
    }
  }

  private onHello(conn: DataConnection, msg: Extract<ClientMessage, { t: "hello" }>) {
    const room = this.room!;
    const reject = (reason: RejectReason) => {
      this.sendTo(conn, { t: "reject", reason });
      setTimeout(() => conn.close(), 300);
    };
    if (msg.version !== PROTOCOL_VERSION) return reject("version");
    if ((room.passwordHash ?? null) !== (msg.passwordHash ?? null)) return reject("password");
    const name = String(msg.name ?? "").trim().slice(0, 24) || "?";

    // Reconnect by id, then by name on a free human seat, then take a new seat before the game.
    const free = (p: LobbyPlayer) => !p.isBot && p.id !== this.myId;
    let seat = room.lobby.find((p) => free(p) && p.id === msg.playerId);
    seat ??= room.lobby.find((p) => free(p) && !p.connected && p.name === name);
    if (!seat && room.game) seat = room.lobby.find((p) => free(p) && !p.connected);
    if (!seat) {
      if (room.game) return reject("started");
      if (room.lobby.length >= room.settings.maxPlayers) return reject("full");
      // The host may hand out another id (e.g. two tabs sharing one).
      const id = msg.playerId && msg.playerId !== this.myId ? String(msg.playerId) : `p-${uid()}`;
      seat = { id, name, isBot: false, connected: true };
      room.lobby.push(seat);
    }
    // Drop an older channel of the same player.
    for (const [other, c] of this.clients) if (c.playerId === seat.id && other !== conn) this.clients.delete(other);
    seat.name = name;
    if (room.game) for (const p of room.game.players) if (p.id === seat.id) p.name = name;
    this.setConnected(seat.id, true);
    this.clients.set(conn, { conn, playerId: seat.id, lastSeen: Date.now() });
    this.sendTo(conn, { t: "welcome", playerId: seat.id, room });
    this.broadcast();
  }

  private applyAs(playerId: string, action: GameAction, conn?: DataConnection) {
    const room = this.room;
    if (!room?.game) return;
    const result = applyAction(room.game, playerId, action, Date.now());
    if (!result.ok) {
      if (conn) this.sendTo(conn, { t: "error", error: result.error });
      else this.fail(result.error);
      return;
    }
    room.game = result.state;
    this.broadcast();
  }

  private pushChat(playerId: string, text: string) {
    const room = this.room;
    if (!room || !text) return;
    room.chat = [...room.chat, { id: uid(), playerId, text, at: Date.now() }].slice(-CHAT_LIMIT);
    this.broadcast();
  }

  private broadcast() {
    const room = this.room;
    if (!room) return;
    // New object identity so React/zustand subscribers see the change.
    this.room = { ...room };
    for (const conn of this.clients.keys()) this.sendTo(conn, { t: "snapshot", room: this.room });
    this.notify();
  }

  private hostTick(beat: boolean) {
    const now = Date.now();
    const room = this.room;
    if (!room) return;
    if (beat) {
      for (const [conn, client] of this.clients) {
        if (now - client.lastSeen > PEER_TIMEOUT_MS) {
          conn.close();
          this.dropClient(conn);
        } else this.sendTo(conn, { t: "ping" });
      }
      if (this.graceUntil && now > this.graceUntil) {
        this.graceUntil = 0;
        const live = new Set([...this.clients.values()].map((c) => c.playerId));
        let changed = false;
        for (const p of room.lobby) {
          if (!p.isBot && p.id !== this.myId && p.connected && !live.has(p.id)) {
            this.setConnected(p.id, false);
            changed = true;
          }
        }
        if (changed) this.broadcast();
      }
    }
    this.runBots(now);
  }

  /** Bots, and humans who dropped out on their turn, play from the host. */
  private runBots(now: number) {
    const game = this.room?.game;
    if (!game || this.busy || (game.phase !== "turn" && game.phase !== "chancellor")) return;
    const seat = this.room!.lobby.find((p) => p.id === game.current);
    const player = game.players.find((p) => p.id === game.current);
    if (!player) return;
    let due: boolean;
    if (player.isBot) due = now - game.updatedAt >= BOT_DELAY_MS;
    else if (seat && !seat.connected && player.id !== this.myId) {
      const since = Math.max(game.updatedAt, this.disconnectedAt.get(player.id) ?? 0);
      due = now - since >= AUTOPILOT_DELAY_MS;
    } else due = false;
    if (!due) return;
    const action = chooseBotAction(game, player.id, randomSeed());
    if (action) this.applyAs(player.id, action);
  }

  // ---------------------------------------------------------------- client internals

  private send(msg: ClientMessage) {
    try {
      if (this.hostConn?.open) void this.hostConn.send(msg);
    } catch {
      /* channel closing */
    }
  }

  private sendTo(conn: DataConnection, msg: HostMessage) {
    try {
      if (conn.open) void conn.send(msg);
    } catch {
      /* channel closing */
    }
  }

  /** Says hello on a fresh channel and waits for the verdict. */
  private handshake(conn: DataConnection): Promise<"ok" | RejectReason | "timeout"> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        conn.off("data", onData);
        conn.close();
        resolve("timeout");
      }, 8000);
      const onData = (data: unknown) => {
        const msg = data as HostMessage;
        if (msg.t === "welcome") {
          clearTimeout(timer);
          conn.off("data", onData);
          this.myId = msg.playerId;
          this.room = msg.room;
          this.attachHost(conn);
          resolve("ok");
        } else if (msg.t === "reject") {
          clearTimeout(timer);
          conn.off("data", onData);
          conn.close();
          resolve(msg.reason);
        }
      };
      conn.on("data", onData);
      void conn.send({
        t: "hello",
        version: PROTOCOL_VERSION,
        playerId: this.myId,
        name: this.profile.name,
        passwordHash: this.passwordHash,
      } satisfies ClientMessage);
    });
  }

  private attachHost(conn: DataConnection) {
    this.hostConn = conn;
    this.lastHostSeen = Date.now();
    conn.on("data", (data) => {
      if (this.hostConn !== conn) return;
      this.lastHostSeen = Date.now();
      const msg = data as HostMessage;
      switch (msg.t) {
        case "snapshot":
          this.room = msg.room;
          this.notify();
          break;
        case "reject":
          this.close(`reject.${msg.reason}`);
          break;
        case "error":
          this.fail(msg.error);
          break;
        case "welcome":
        case "ping":
          break;
      }
    });
    conn.on("close", () => {
      if (this.hostConn === conn && !this.isClosed()) void this.migrate();
    });
  }

  /**
   * The host is gone. Every peer derives the same ordered list of candidates from its snapshot;
   * candidate `a` hosts at epoch `old + 1 + a`. Try them in turn.
   */
  private async migrate() {
    if (this.status !== "open" || !this.room) return;
    this.status = "migrating";
    this.hostConn = null;
    this.notify();
    const room = this.room;
    const oldHost = room.hostId;
    const candidates = room.lobby.filter((p) => !p.isBot && p.id !== oldHost && p.connected).map((p) => p.id);
    for (let a = 0; a < candidates.length; a++) {
      const epoch = room.epoch + 1 + a;
      if (candidates[a] === this.myId) {
        if (await this.takeOver(epoch, oldHost)) return;
        continue;
      }
      const deadline = Date.now() + MIGRATION_ATTEMPT_MS;
      while (Date.now() < deadline && !this.isClosed()) {
        if (!this.peer || this.peer.destroyed) {
          try {
            this.peer = await openPeer();
          } catch {
            await wait(1500);
            continue;
          }
        }
        try {
          const conn = await connectTo(this.peer, hostPeerId(room.code, epoch), 3000);
          const result = await this.handshake(conn);
          if (result === "ok") {
            this.status = "open";
            this.notify();
            return;
          }
          if (FATAL.includes(result as RejectReason)) return this.close(`reject.${result}`);
        } catch {
          /* not there yet */
        }
        await wait(1500);
      }
    }
    this.close("closed.hostLost");
  }

  private async takeOver(epoch: number, oldHost: string): Promise<boolean> {
    this.destroyPeer();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        this.peer = await openPeer(hostPeerId(this.room!.code, epoch));
        break;
      } catch {
        await wait(1500);
      }
    }
    if (!this.peer || this.isClosed()) return false;
    const room = this.room!;
    this.role = "host";
    room.epoch = epoch;
    room.hostId = this.myId;
    this.setConnected(oldHost, false);
    if (room.game) room.game.updatedAt = Date.now();
    this.graceUntil = Date.now() + MIGRATION_GRACE_MS;
    this.listenAsHost();
    this.status = "open";
    this.broadcast();
    return true;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
