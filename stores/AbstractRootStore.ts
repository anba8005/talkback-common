import { SessionService } from '../services/SessionService';
import { StreamingService } from '../services/StreamingService';
import { IntercomStore } from './IntercomStore';
import { OffairStore } from './OffairStore';
import { TallyStore } from './TallyStore';
import { SettingsPersister, SettingsStore } from './SettingsStore';
import { autoEffect, store } from '@risingstack/react-easy-state';
import { NotificationStore } from './NotificationStore';

interface Store {
	connected: boolean | null;
	failed: boolean;
}

export class AbstractRootStore {
	private _intercom: IntercomStore;
	private _offair: OffairStore;
	private _tally: TallyStore;
	private _settings: SettingsStore;
	private _notification: NotificationStore;

	private _reconnectTimeout: any;

	private _store: Store = store({
		connected: null,
		failed: false,
	});

	constructor(
		private _sessionService: SessionService,
		private _streamingService: StreamingService,
		private _tallyService: StreamingService,
		persister: SettingsPersister,
	) {
		this._intercom = new IntercomStore(_sessionService);
		this._offair = new OffairStore(_streamingService);
		this._tally = new TallyStore(_tallyService);
		this._settings = new SettingsStore(persister);
		this._notification = new NotificationStore();
		//
		_sessionService.onFailed(() => {
			this._store.failed = true;
			if (!this._reconnectTimeout) {
				this._reconnectWithTimeout();
			}
		});
		//
		autoEffect(() => {
			this._notification.updateOnline(!this._store.failed);
		});
	}

	public get intercom() {
		return this._intercom;
	}

	public get offair() {
		return this._offair;
	}

	public get tally() {
		return this._tally;
	}

	public get settings() {
		return this._settings;
	}

	public get notification() {
		return this._notification;
	}

	public async hydrate() {
		await this._settings.hydrate();
	}

	public async connect() {
		this._store.failed = false;
		this._applyConfiguration();
		//
		try {
			await this._sessionService.connect(this.settings.urlWs);
			this._store.connected = true;
		} catch (e) {
			this._store.connected = false;
			this._store.failed = true;
			throw e;
		}
	}

	private _applyConfiguration() {
		// update common group settings
		this._intercom.setNumGroups(this.settings.numGroups);
		this._intercom.groups.forEach((group) => {
			group._service.setAutoStart(false);
			group._service.setAEC(this.settings.aec);
			group._service.setDisplayName(String(this.settings.channel));
			group.reset();
		});
		// start room if not multiroom
		if (this.settings.intercom) {
			if (!this.settings.multiRoom) {
				console.debug(`Activating intercom group -> ${this.settings.roomId}`);
				this._intercom.activateAndStartGroupById(this.settings.roomId);
			} else {
				console.debug(`Deactivating intercom group -> ${this.settings.roomId}`);
				this._intercom.activateAndStartGroupById(0);
			}
		}
		//
		this._streamingService.setAutoStart(this.settings.offair);
		this._streamingService.setRoomId(1);
		//
		this._tallyService.setStreamingEnabled(false);
		this._tallyService.setDatachannelEnabled(true);
		this._tallyService.setRoomId(100);
	}

	public disconnect() {
		this._sessionService.timeoutHandler.clearTimeout(this._reconnectTimeout);
		this._reconnectTimeout = undefined;
		this._store.connected = null;
		this._store.failed = false;
		this._sessionService.timeoutHandler.setTimeout(() => {
			this._sessionService.disconnect().catch(console.error);
		}, 1);
	}

	public isConnected() {
		return this._store.connected;
	}

	private async _reconnect() {
		this._store.failed = false;
		try {
			await this._sessionService.disconnect();
			await this._sessionService.connect(this.settings.urlWs);
		} catch (e) {
			this._store.failed = true;
			throw e;
		}
	}

	private _reconnectWithTimeout() {
		this._reconnectTimeout = this._sessionService.timeoutHandler.setTimeout(
			() => {
				this._reconnect()
					.then(() => {
						this._reconnectTimeout = undefined;
					})
					.catch(() => {
						this._reconnectWithTimeout();
					});
			},
			5000,
		);
	}
}
