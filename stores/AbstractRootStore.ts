import { SessionService } from '../services/SessionService';
import { StreamingService } from '../services/StreamingService';
import { IntercomStore } from './IntercomStore';
import { OffairStore } from './OffairStore';
import { TallyStore } from './TallyStore';
import { SettingsPersister, SettingsStore } from './SettingsStore';
import { store } from '@risingstack/react-easy-state';

interface Store {
	connected: boolean | null;
}

export class AbstractRootStore {
	private _intercom: IntercomStore;
	private _offair: OffairStore;
	private _tally: TallyStore;
	private _settings: SettingsStore;

	private _store: Store = store({
		connected: null,
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

	public async hydrate() {
		// load settings
		await this._settings.hydrate();
		// update common group settings
		this._intercom.setNumGroups(this.settings.numGroups);
		this._intercom.groups.forEach((group) => {
			group._service.setAutoStart(false);
			group._service.setAEC(this.settings.aec);
			group._service.setDisplayName(String(this.settings.channel));
			group.reset();
		});
		// start room if not multiroom
		if (!this.settings.multiRoom) {
			console.debug(`Activating intercom group -> ${this.settings.roomId}`);
			this._intercom.activateAndStartGroupById(this.settings.roomId);
		} else {
			console.debug(`Deactivating intercom group -> ${this.settings.roomId}`);
			this._intercom.activateAndStartGroupById(0);
		}
		//
		this._streamingService.setStreamingEnabled(this.settings.offair);
		this._streamingService.setRoomId(1);
		//
		this._tallyService.setStreamingEnabled(false);
		this._tallyService.setDatachannelEnabled(true);
		this._tallyService.setRoomId(100);
	}

	public async connect() {
		try {
			await this._sessionService.connect(this.settings.urlWs);
			this._store.connected = true;
		} catch (e) {
			console.error(e);
			this._store.connected = false;
		}
	}

	public disconnect() {
		this._store.connected = null;
		setTimeout(() => {
			this._sessionService.disconnect().catch(console.error);
		});
	}

	public isConnected() {
		return this._store.connected;
	}
}
