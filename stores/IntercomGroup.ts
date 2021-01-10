import { batch, store } from '@risingstack/react-easy-state';
import { CMediaStream as MediaStream } from '../../utils/RTCTypes';
import {
	AudioBridgeService,
	Participant,
} from '../services/AudioBridgeService';

const DEFAULTS = {
	connected: false,
	failed: false,
	participants: [] as Participant[],
	muted: true,
	talk: false,
};

export class IntercomGroup {
	private _stream: MediaStream | null = null;

	private _error: Error | null = null;

	private _store = store({
		...DEFAULTS,
	});

	constructor(private _audioBridge: AudioBridgeService) {
		_audioBridge.onError((error) =>
			batch(() => {
				if (error) {
					this._setStream(null);
				}
				this._setError(error);
			}),
		);
		_audioBridge.onStream((stream) =>
			batch(() => {
				if (stream) {
					this._setError(null);
				}
				this._setStream(stream);
			}),
		);
		_audioBridge.onList((participants) => {
			participants.sort((p1, p2) => {
				return p1.channel - p2.channel;
			});
			this._store.participants = participants;
		});
	}

	public get muted() {
		return this._store.muted;
	}

	public setMuted(muted: boolean) {
		this._store.muted = muted;
	}

	public get talk() {
		return this._store.talk;
	}

	public setTalk(talk: boolean) {
		if (this._store.talk !== talk) {
			this._audioBridge.setTalk(talk);
		}
		this._store.talk = talk;
	}

	public get roomId() {
		return this._audioBridge.roomId;
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

	public get participants() {
		return this._store.participants;
	}

	public get _service() {
		return this._audioBridge;
	}

	public start() {
		batch(() => {
			this._audioBridge.setAutoStart(true);
			this._audioBridge.start().catch(console.error);
			this._store.muted = false;
		});
	}

	public stop() {
		batch(() => {
			this._store.participants = [];
			this._store.muted = true;
			this._audioBridge.stop();
			this._audioBridge.setAutoStart(false);
			this.setTalk(false);
		});
	}

	public reset() {
		Object.assign(this._store, DEFAULTS);
		this._audioBridge.setTalk(false);
	}

	private _setError(error: Error | null) {
		this._error = error;
		this._store.failed = error !== null;
		if (this._error) {
			console.error('intercom failed with error');
			console.error(error);
		}
	}

	private _setStream(stream: MediaStream | null) {
		this._stream = stream;
		this._store.connected = stream !== null;
		console.log(`intercom stream arrived -> ${String(this._store.connected)}`);
	}
}

export function createIntercomGroup(audioBridge: AudioBridgeService) {
	return new IntercomGroup(audioBridge);
}
