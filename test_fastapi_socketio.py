from fastapi import FastAPI
import uvicorn
import socketio as sio

app_test = FastAPI()
sio_test = sio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
socket_app_test = sio.ASGIApp(sio_test, socketio_path='socket.io')
app_test.mount("/ws_test", socket_app_test)

@app_test.get("/")
async def read_root():
    return {"Hello": "FastAPI Test"}

@sio_test.event
async def connect(sid, environ, auth):
    print(f"Tes Connect: SID={sid} terhubung.")
    await sio_test.emit('ack_test', {'data': 'terhubung ke tes!'}, to=sid)

if __name__ == "__main__":
    uvicorn.run(app_test, host="0.0.0.0", port=5000)