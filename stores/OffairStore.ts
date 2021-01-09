import { batch, store } from '@risingstack/react-easy-state';
import { MediaStream } from '../../utils/RTCTypes';
import { StreamingService } from '../services/StreamingService';

export class OffairStore {
	private _stream: MediaStream | null = null;

	private _error: Error | null = null;

	private _store = store({
		connected: false,
		failed: false,
		muted: true,
	});

	constructor(private _streaming: StreamingService) {
		_streaming.onError((error) =>
			batch(() => {
				if (error) {
					this._setStream(null);
				}
				this._setError(error);
			}),
		);
		_streaming.onStream((stream) =>
			batch(() => {
				if (stream) {
					this._setError(null);
				}
				this._setStream(stream);
			}),
		);
	}

	public get muted() {
		return this._store.muted;
	}

	public setMuted(muted: boolean) {
		this._store.muted = muted;
		this._streaming.setStreamingMuted(muted);
	}

	public get stream() {
		return this._stream;
	}

	public get connected() {
		return this._store.connected;
	}

	public get error() {
		return this._error;
	}

	public get failed() {
		return this._store.failed;
	}

	public updateVisible(visible: boolean) {
		this._streaming.setStreamingPaused(!visible);
	}

	private _setError(error: Error | null) {
		this._error = error;
		this._store.failed = error !== null;
		if (this._error) {
			console.error('offair failed with error');
			console.error(error);
		}
	}

	private _setStream(stream: MediaStream | null) {
		this._stream = stream;
		this._store.connected = stream !== null;
		console.log('offair connected -> ' + this._store.connected);
	}
}
