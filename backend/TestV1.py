from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
from dotenv import load_dotenv
from websockets import connect
from typing import Dict, Optional
import threading
import time
import pytchat
import websockets

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GeminiConnection:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model = "gemini-2.0-flash-exp"
        self.uri = (
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={self.api_key}"
        )
        self.ws = None
        self.config = None

    async def connect(self):
        """Initialize connection to Gemini"""
        self.ws = await connect(self.uri, additional_headers={"Content-Type": "application/json"})
        
        if not self.config:
            raise ValueError("Configuration must be set before connecting")

        # Send initial setup message with configuration
        setup_message = {
            "setup": {
                "model": f"models/{self.model}",
                "generation_config": {
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": self.config["voice"]
                            }
                        }
                    }
                },
                "system_instruction": {
                    "parts": [
                        {
                            "text": self.config["systemPrompt"]
                        }
                    ]
                }
            }
        }
        await self.ws.send(json.dumps(setup_message))
        
        # Wait for setup completion
        setup_response = await self.ws.recv()
        return setup_response

    def set_config(self, config):
        """Set configuration for the connection"""
        self.config = config

    async def send_audio(self, audio_data: str):
        """Send audio data to Gemini"""
        realtime_input_msg = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": audio_data,
                        "mime_type": "audio/pcm"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(realtime_input_msg)) # type: ignore

    async def receive(self):
        """Receive message from Gemini"""
        return await self.ws.recv() # type: ignore

    async def close(self):
        """Close the connection"""
        if self.ws:
            await self.ws.close()

    async def send_image(self, image_data: str):
        """Send image data to Gemini"""
        image_message = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": image_data,
                        "mime_type": "image/jpeg"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(image_message)) # type: ignore

    async def send_text(self, text: str):
        """Send text message to Gemini"""
        text_message = {
            "client_content": {
                "turns": [
                    {
                        "role": "user",
                        "parts": [{"text": text}]
                    }
                ],
                "turn_complete": True
            }
        }
        await self.ws.send(json.dumps(text_message)) # type: ignore

# Store active connections
connections: Dict[str, GeminiConnection] = {}

# Track YouTube chat watchers per client
yt_watchers: Dict[str, Dict[str, Optional[threading.Thread]]] = {}

# Per-client state: last activity and whether YT auto-reply is allowed
client_states: Dict[str, Dict[str, object]] = {}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    try:
        # Create new Gemini connection for this client
        gemini = GeminiConnection()
        connections[client_id] = gemini
        yt_watchers[client_id] = {"thread": None, "stop": None}
        client_states[client_id] = {
            "last_activity": time.time(),
            "allow_yt_reply": False,
            "mode": "audio",            # 'audio' | 'camera' | 'screen'
            "last_image": 0.0,            # timestamp of last image frame
            "last_yt_chat": 0.0,          # timestamp of last received yt chat line
            "last_proactive": 0.0,        # cooldown for proactive prompts
        }

        # Grab the running loop to schedule tasks from threads
        loop = asyncio.get_running_loop()

        # Helper: sanitize text to avoid invalid frames / unsafe payloads
        def sanitize_for_model(s: str, max_len: int = 500) -> str:
            try:
                # Remove control chars except tab and space
                s = ''.join(ch if (ord(ch) >= 32 or ch in '\t ') else ' ' for ch in s)
                # Normalize line breaks to spaces
                s = s.replace('\r', ' ').replace('\n', ' ')
                # Drop any problematic surrogates
                s = s.encode('utf-8', 'ignore').decode('utf-8', 'ignore')
            except Exception:
                pass
            s = s.strip()
            if len(s) > max_len:
                s = s[:max_len] + '…'
            return s

        # Helper: safely send text to Gemini; reconnect if connection was closed by server (e.g., 1007 Unsafe prompt)
        async def safe_send_text(payload: str):
            try:
                await gemini.send_text(payload)
            except websockets.exceptions.ConnectionClosed as e:  # pyright: ignore[reportGeneralTypeIssues]
                reason = getattr(e, 'reason', '') or ''
                code = getattr(e, 'code', None)
                # If unsafe prompt or 1007, do not resend the same payload
                if code == 1007 or ('Unsafe prompt' in str(reason)):
                    print(f"Gemini closed on unsafe/invalid payload (code={code}, reason={reason}). Skipping message.")
                    try:
                        if websocket.client_state.value != 3:
                            await websocket.send_json({
                                "type": "yt_chat_skipped",
                                "data": {"reason": "unsafe"}
                            })
                    except Exception:
                        pass
                    # Try to reconnect for subsequent messages
                    try:
                        await gemini.connect()
                    except Exception as e2:
                        print(f"Gemini reconnect after unsafe failed: {e2}")
                    return
                # For other close reasons, try to reconnect and resend once
                try:
                    await gemini.connect()
                    await gemini.send_text(payload)
                except Exception as e2:
                    print(f"Gemini send_text failed after reconnect: {e2}")
            except Exception as e:
                print(f"Gemini send_text error: {e}")

        # Wait for initial configuration
        config_data = await websocket.receive_json()
        if config_data.get("type") != "config":
            raise ValueError("First message must be configuration")

        # Set the configuration
        gemini.set_config(config_data.get("config", {}))

        # Initialize Gemini connection
        await gemini.connect()

    # Handle bidirectional communication
        async def receive_from_client():
            try:
                while True:
                    try:
                        # Check if connection is closed
                        if websocket.client_state.value == 3:  # WebSocket.CLOSED
                            print("WebSocket connection closed by client")
                            return

                        message = await websocket.receive()

                        # Check for close message
                        if message["type"] == "websocket.disconnect":
                            print("Received disconnect message")
                            return

                        raw = message.get("text")
                        if raw is None and message.get("bytes") is not None:
                            try:
                                raw = message.get("bytes").decode("utf-8") # pyright: ignore[reportOptionalMemberAccess]
                            except Exception:
                                raw = "{}"
                        if raw is None:
                            raw = "{}"
                        message_content = json.loads(raw)

                        msg_type = message_content.get("type")
                        if msg_type == "audio":
                            await gemini.send_audio(message_content["data"])
                            # Audio frames come continuously; don't use them for idle detection directly
                        elif msg_type == "image":
                            await gemini.send_image(message_content["data"])
                            st = client_states.get(client_id)
                            if st is not None:
                                st["last_image"] = time.time()
                        elif msg_type == "text":
                            await gemini.send_text(message_content["data"])
                            # Treat explicit text as activity
                            st = client_states.get(client_id)
                            if st is not None:
                                st["last_activity"] = time.time()
                                st["allow_yt_reply"] = False
                        elif msg_type == "mode":
                            # Expect { type: 'mode', mode: 'audio'|'camera'|'screen' }
                            m = message_content.get("mode")
                            if m in ("audio", "camera", "screen"):
                                st = client_states.get(client_id)
                                if st is not None:
                                    st["mode"] = m
                        elif msg_type == "user_activity":
                            # Expect { type: 'user_activity', speaking: true/false }
                            speaking = bool(message_content.get("speaking", False))
                            if speaking:
                                st = client_states.get(client_id)
                                if st is not None:
                                    st["last_activity"] = time.time()
                                    st["allow_yt_reply"] = False
                        elif msg_type == "yt_chat_start":
                            # message_content expects { type: 'yt_chat_start', video_id: '...' }
                            video_id = message_content.get("video_id")
                            if not video_id:
                                await websocket.send_json({"type": "error", "data": "Missing video_id for yt_chat_start"})
                            else:
                                # Start watcher in a thread
                                def run_chat():
                                    stop_flag = yt_watchers[client_id]["stop"]
                                    # Disable signal handling in non-main thread
                                    chat = pytchat.create(video_id=video_id, interruptable=False)
                                    try:
                                        while chat.is_alive():
                                            if stop_flag and stop_flag.is_set(): # type: ignore
                                                break
                                            for c in chat.get().sync_items(): # type: ignore
                                                user = c.author.name
                                                msg = c.message
                                                # Sanitize/limit to avoid unsafe payloads
                                                clean_msg = sanitize_for_model(str(msg))
                                                text = f"[YouTube] {user}: {clean_msg}"
                                                # Update last yt chat time
                                                try:
                                                    st = client_states.get(client_id)
                                                    if st is not None:
                                                        st["last_yt_chat"] = time.time()
                                                except Exception:
                                                    pass
                                                # Forward to Gemini only when idle mode allows
                                                try:
                                                    st = client_states.get(client_id)
                                                    allow = bool(st.get("allow_yt_reply", False)) if st else False
                                                except Exception:
                                                    allow = False
                                                if allow:
                                                    try:
                                                        asyncio.run_coroutine_threadsafe(
                                                            safe_send_text(text), loop
                                                        )
                                                    except Exception:
                                                        pass
                                                # Forward to client UI on main loop
                                                try:
                                                    if websocket.client_state.value != 3:
                                                        asyncio.run_coroutine_threadsafe(
                                                            websocket.send_json({
                                                                "type": "yt_chat",
                                                                "data": {"user": user, "message": msg}
                                                            }),
                                                            loop,
                                                        )
                                                except Exception:
                                                    pass
                                            # small sleep to avoid tight loop
                                            time.sleep(0.1)
                                    finally:
                                        try:
                                            chat.terminate()
                                        except Exception:
                                            pass

                                # Ensure previous watcher is stopped
                                prev_thread = yt_watchers[client_id].get("thread")
                                prev_stop = yt_watchers[client_id].get("stop")
                                if prev_stop and isinstance(prev_stop, threading.Event):
                                    prev_stop.set()
                                if prev_thread and prev_thread.is_alive():
                                    prev_thread.join(timeout=2)

                                stop_event = threading.Event()
                                yt_watchers[client_id]["stop"] = stop_event # type: ignore
                                t = threading.Thread(target=run_chat, daemon=True)
                                yt_watchers[client_id]["thread"] = t
                                t.start()
                                await websocket.send_json({"type": "yt_chat_status", "data": "started"})
                        elif msg_type == "yt_chat_stop":
                            prev_thread = yt_watchers[client_id].get("thread")
                            prev_stop = yt_watchers[client_id].get("stop")
                            if prev_stop and isinstance(prev_stop, threading.Event):
                                prev_stop.set()
                            if prev_thread and prev_thread.is_alive():
                                prev_thread.join(timeout=2)
                            yt_watchers[client_id]["thread"] = None
                            yt_watchers[client_id]["stop"] = None
                            await websocket.send_json({"type": "yt_chat_status", "data": "stopped"})
                        elif msg_type == "ping":
                            # simple pong for latency measurement
                            ts = message_content.get("ts")
                            try:
                                await websocket.send_json({"type": "pong", "ts": ts})
                            except Exception:
                                pass
                        else:
                            print(f"Unknown message type: {msg_type}")
                    except json.JSONDecodeError as e:
                        print(f"JSON decode error: {e}")
                        continue
                    except KeyError as e:
                        print(f"Key error in message: {e}")
                        continue
                    except Exception as e:
                        print(f"Error processing client message: {str(e)}")
                        if "disconnect message" in str(e):
                            return
                        continue
            except Exception as e:
                print(f"Fatal error in receive_from_client: {str(e)}")
                return

        async def receive_from_gemini():
            try:
                while True:
                    if websocket.client_state.value == 3:  # WebSocket.CLOSED
                        print("WebSocket closed, stopping Gemini receiver")
                        return

                    try:
                        msg = await gemini.receive()
                    except websockets.exceptions.ConnectionClosed as e:  # pyright: ignore[reportGeneralTypeIssues]
                        # Try to reconnect and continue listening
                        print(f"Gemini connection closed ({e.code} {e.reason}), reconnecting…")
                        try:
                            await gemini.connect()
                            continue
                        except Exception as e2:
                            print(f"Gemini reconnect failed: {e2}")
                            await asyncio.sleep(1)
                            continue

                    response = json.loads(msg)

                    # Forward audio data to client
                    try:
                        parts = response["serverContent"]["modelTurn"]["parts"]
                        for p in parts:
                            # Check connection state before each send
                            if websocket.client_state.value == 3:
                                return

                            if "inlineData" in p:
                                audio_data = p["inlineData"]["data"]
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": audio_data
                                })
                            elif "text" in p:
                                print(f"Received text: {p['text']}")
                                await websocket.send_json({
                                    "type": "text",
                                    "text": p["text"]
                                })
                    except KeyError:
                        pass

                    # Handle turn completion
                    try:
                        if response["serverContent"]["turnComplete"]:
                            await websocket.send_json({
                                "type": "turn_complete",
                                "data": True
                            })
                    except KeyError:
                        pass
            except Exception as e:
                print(f"Error receiving from Gemini: {e}")

        # Run both receiving tasks concurrently
        async def idle_monitor():
            # Toggle allow_yt_reply after 10s of no user activity
            try:
                while True:
                    st = client_states.get(client_id)
                    if st is None:
                        await asyncio.sleep(1)
                        continue
                    last = float(st.get("last_activity", time.time())) # type: ignore
                    idle = (time.time() - last) >= 10.0
                    st["allow_yt_reply"] = bool(idle)
                    await asyncio.sleep(1)
            except asyncio.CancelledError:
                return

        async def proactive_monitor():
            # When idle, in screen mode, recent image, and no yt chat, occasionally prompt small talk about the screen
            try:
                while True:
                    st = client_states.get(client_id)
                    if st is None:
                        await asyncio.sleep(1)
                        continue
                    now = time.time()
                    mode = st.get("mode", "audio")
                    idle = bool(st.get("allow_yt_reply", False))
                    last_img = float(st.get("last_image", 0.0)) # type: ignore
                    last_chat = float(st.get("last_yt_chat", 0.0)) # type: ignore
                    last_pro = float(st.get("last_proactive", 0.0)) # type: ignore

                    screen_active = (mode == "screen") and (now - last_img <= 5.0)
                    chat_quiet = (now - last_chat >= 20.0)
                    cooldown_over = (now - last_pro >= 30.0)

                    if idle and screen_active and chat_quiet and cooldown_over:
                        prompt = (
                            "จากภาพหน้าจอปัจจุบัน ชวนคุยด้วยประโยคสั้นๆ 1-2 ประโยคเกี่ยวกับสิ่งที่ผู้ใช้กำลังทำอยู่ "
                            "ให้เป็นกันเองแบบเพื่อน พูดสั้น กระชับ และสุภาพน้อยลงเล็กน้อยตามโทนบทบาทเดิม"
                        )
                        try:
                            await safe_send_text(prompt)
                            st["last_proactive"] = now
                        except Exception as e:
                            print(f"proactive_monitor send error: {e}")
                    await asyncio.sleep(2)
            except asyncio.CancelledError:
                return

        async with asyncio.TaskGroup() as tg:
            tg.create_task(receive_from_client())
            tg.create_task(receive_from_gemini())
            tg.create_task(idle_monitor())
            tg.create_task(proactive_monitor())

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Cleanup
        if client_id in connections:
            await connections[client_id].close()
            del connections[client_id]
        # Stop yt watcher if running
        if client_id in yt_watchers:
            try:
                prev_thread = yt_watchers[client_id].get("thread")
                prev_stop = yt_watchers[client_id].get("stop")
                if prev_stop and isinstance(prev_stop, threading.Event):
                    prev_stop.set()
                if prev_thread and prev_thread.is_alive():
                    prev_thread.join(timeout=2)
            except Exception:
                pass
            finally:
                del yt_watchers[client_id]
        if client_id in client_states:
            try:
                del client_states[client_id]
            except Exception:
                pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)