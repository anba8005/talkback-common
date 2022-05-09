/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
	ISimpleEventHandler,
	SimpleEventDispatcher,
} from 'strongly-typed-events';
import {
	CMediaStream as MediaStream,
	CRTCDataChannel as RTCDataChannel,
} from '../../utils/RTCTypes';
import { getRandomIntInclusive } from '../utils/Helpers';
import { StreamingPlugin, StreamingPluginName } from '../utils/Janus';
import { AbstractJanusService } from './AbstractJanusService';
import { SessionService } from './SessionService';

export interface TallyMessage {
	pgm: number[];
}

export interface DataMessage {
	tally: TallyMessage;
}

export class StreamingService extends AbstractJanusService<StreamingPlugin> {
	private _streamEvent = new SimpleEventDispatcher<MediaStream | null>();
	private _messageEvent = new SimpleEventDispatcher<DataMessage>();

	private _channel?: RTCDataChannel;

	private _datachannelEnabled = false;

	private _streamingEnabled = true;

	private _streamingPaused = false;

	private _streamingMuted = true;

	constructor(sessionService: SessionService) {
		super(sessionService, StreamingPluginName);
	}

	public onStream(handler: ISimpleEventHandler<MediaStream | null>) {
		return this._streamEvent.asEvent().subscribe(handler);
	}

	public onMessage(handler: ISimpleEventHandler<DataMessage>) {
		return this._messageEvent.asEvent().subscribe(handler);
	}

	public setStreamingEnabled(enabled: boolean) {
		this._streamingEnabled = enabled;
	}

	public setDatachannelEnabled(enabled: boolean) {
		this._datachannelEnabled = enabled;
	}

	public setStreamingMuted(muted: boolean) {
		this._streamingMuted = muted;
		if (this.plugin && this._streamingEnabled) {
			this.plugin.configure({ audio: !muted }).catch(console.error);
		}
	}

	public setStreamingPaused(paused: boolean) {
		if (this._streamingPaused !== paused && this.plugin && this.roomId) {
			if (paused) {
				this.plugin.pause().catch(console.error);
			} else {
				this.plugin.start().catch(console.error);
			}
		}
		this._streamingPaused = paused;
	}

	protected async afterCreatePlugin() {
		if (this.plugin && this.roomId) {
			//
			this.plugin.on('pc:track:remote', (event) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				this._streamEvent.dispatch(event.streams[0]);
			});
			//
			const options = this._streamingEnabled
				? {}
				: { offer_video: false, offer_audio: false };
			//
			try {
				await this.plugin.connect(this.roomId, options);
				//
				if (this._datachannelEnabled) {
					this._setupDataChannel(this.plugin);
				}
				//
				if (this._streamingMuted && this._streamingEnabled) {
					await this.plugin.configure({ audio: false });
				}
				//
				if (!this._streamingPaused) {
					await this.plugin.start();
				}
			} catch (e: any) {
				this.errorEvent.dispatch(e);
			}
		}
	}

	protected beforeDestroyPlugin() {
		this._channel?.close();
		this._streamEvent.dispatch(null);
	}

	private _setupDataChannel(plugin: StreamingPlugin) {
		const pc = plugin._pc;
		//
		this._channel = pc.createDataChannel(
			String(getRandomIntInclusive(0, Number.MAX_SAFE_INTEGER - 1)),
		);
		//
		const listener = (e: any) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			e.channel.onmessage = (msg: any) => {
				try {
					const message = String(msg.data)
						.replaceAll('\n', '')
						.replaceAll('\r', '');
					this._messageEvent.dispatch(JSON.parse(message));
				} catch (ex) {
					console.error(ex);
				}
			};
		};
		pc.addEventListener('datachannel', listener);
	}
}
