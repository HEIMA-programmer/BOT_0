from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    socketio.run(
        app,
        debug=app.debug,
        port=5000,
        allow_unsafe_werkzeug=app.debug,
    )
