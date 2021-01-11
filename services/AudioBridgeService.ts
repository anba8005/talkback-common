/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	ISimpleEventHandler,
	SimpleEventDispatcher,
} from 'strongly-typed-events';
import {
	getUserMedia,
	CMediaStream as MediaStream,
} from '../../utils/RTCTypes';
import { AudioBridgePlugin, AudioBridgePluginName } from '../utils/Janus';
import { AbstractJanusService } from './AbstractJanusService';
import { SessionService } from './SessionService';

const AUDIO_NO_AEC_CONSTRAINTS = {
	echoCancellation: false,
	googEchoCancellation: false,
	googEchoCancellation2: false,
	googDAEchoCancellation: false,
};

export interface Participant {
	id: number;
	channel: number;
}

export class AudioBridgeService extends AbstractJanusService<AudioBridgePlugin> {
	private static _stream?: MediaStream;
	private static _numStreamUsers = 0;

	private _streamEvent = new SimpleEventDispatcher<MediaStream | null>();

	private _listEvent = new SimpleEventDispatcher<Participant[]>();

	private _talk = false;

	private _aec = false;

	private _displayName = '';

	private _participants: Map<number, string> = new Map<number, string>();

	constructor(sessionService: SessionService) {
		super(sessionService, AudioBridgePluginName);
	}

	public onStream(handler: ISimpleEventHandler<MediaStream | null>) {
		return this._streamEvent.asEvent().subscribe(handler);
	}

	public onList(handler: ISimpleEventHandler<Participant[]>) {
		return this._listEvent.asEvent().subscribe(handler);
	}

	public setTalk(talk: boolean) {
		this._talk = talk;
		if (this.plugin) {
			console.debug(
				`Setting audioBridge ${String(this.roomId)} -> talk -> ${String(
					this._talk,
				)}`,
			);
			this.plugin.configure({ muted: !talk }).catch(console.error);
		}
	}

	public setDisplayName(displayName: string) {
		this._displayName = displayName;
		if (this.plugin) {
			this.plugin.configure({ display: displayName }).catch(console.error);
		}
	}

	public setAEC(aec: boolean) {
		this._aec = aec;
	}

	protected async afterCreatePlugin() {
		if (this.plugin && this.roomId) {
			console.debug(
				`Starting audioBridge ${String(this.roomId)} -> talk -> ${String(
					this._talk,
				)}`,
			);
			//
			this.plugin.on('pc:track:remote', (event) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this._streamEvent.dispatch(event.streams[0]);
			});
			//
			this.plugin.on('message', (event) => this._processIncomingEvent(event));
			//
			this._participants.clear();
			//
			try {
				//
				AudioBridgeService._numStreamUsers++;
				//
				await this.plugin.connect(this.roomId, {
					display: this._displayName,
				});
				//
				if (!AudioBridgeService._stream) {
					console.debug('executing getUserMedia');
					AudioBridgeService._stream = await getUserMedia({
						audio: !this._aec ? AUDIO_NO_AEC_CONSTRAINTS : true,
						video: false,
					});
				}
				//
				await this.plugin.offerStream(AudioBridgeService._stream, null, {
					muted: !this._talk,
				});
			} catch (e) {
				this.errorEvent.dispatch(e);
			}
		}
	}

	protected beforeDestroyPlugin(): void {
		this._streamEvent.dispatch(null);
		AudioBridgeService._numStreamUsers--;
		if (
			AudioBridgeService._numStreamUsers === 0 &&
			AudioBridgeService._stream
		) {
			console.debug('killing getUserMedia stream');
			AudioBridgeService._stream
				.getTracks()
				.forEach((track: MediaStreamTrack) => track.stop());
			AudioBridgeService._stream = undefined;
		}
	}

	private _processIncomingEvent(event: any) {
		// joined
		if (event.getResultText() === 'joined') {
			const participants = event.getPluginData().participants;
			if (Array.isArray(participants)) {
				participants.forEach((obj) => {
					this._participants.set(obj.id, obj.display);
				});
				this._dispatchParticipants();
			}
		}
		// leaving
		if (event.getResultText() === 'event' && event.getPluginData().leaving) {
			const id = event.getPluginData().leaving;
			this._participants.delete(id);
			this._dispatchParticipants();
		}
	}

	private _dispatchParticipants() {
		const participants: Participant[] = [];
		//
		this._participants.forEach((value, key) => {
			participants.push({ id: key, channel: Number(value) });
		});
		//
		participants.push({ id: 0, channel: Number(this._displayName) });
		//
		this._listEvent.dispatch(participants);
	}
}

export function createAudioBridgeService(
	sessionService: SessionService,
	roomId: number,
	autoStart: boolean,
) {
	const service = new AudioBridgeService(sessionService);
	service.setRoomId(roomId);
	service.setAutoStart(autoStart);
	return service;
}
