import { SessionService } from '../services/SessionService';
import { AudioBridgeService } from '../services/AudioBridgeService';
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
		private _audioBridgeService: AudioBridgeService,
		private _streamingService: StreamingService,
		private _tallyService: StreamingService,
		persister: SettingsPersister,
	) {
		this._intercom = new IntercomStore(_audioBridgeService);
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
		// update service settings
		this._audioBridgeService.setEnabled(this.settings.intercom);
		this._audioBridgeService.setAEC(this.settings.aec);
		this._audioBridgeService.setRoomId(this.settings.roomId);
		this._audioBridgeService.setDisplayName(String(this.settings.channel));
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

	public async disconnect() {
		this._store.connected = null;
		try {
			await this._sessionService.disconnect();
		} catch (e) {
			console.error(e);
		}
	}

	public isConnected() {
		return this._store.connected;
	}
}
