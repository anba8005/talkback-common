import { store, batch } from '@risingstack/react-easy-state';

export abstract class SettingsPersister {
	public abstract load(): Promise<Settings | null>;
	public abstract save(settings: Settings): Promise<void>;
}

export interface Settings {
	url: string;
	roomId: number;
	channel: number;
	intercom: boolean;
	offair: boolean;
	aec: boolean;
}

const DEFAULT: Settings = {
	url: 'wss://turn.b3video.lt/janus',
	roomId: 1,
	channel: 0,
	intercom: true,
	offair: true,
	aec: false,
};

export class SettingsStore {
	private _settings = store(DEFAULT);

	private _store = store({
		dialogOpen: false,
	});

	constructor(private _presister: SettingsPersister) {}

	public async hydrate() {
		const settings = await this._presister.load();
		Object.assign(this._settings, settings);
	}

	public get url() {
		return this._settings.url;
	}

	public get urlWs() {
		return this._settings.url
			.replaceAll('http://', 'ws://')
			.replaceAll('https://', 'wss://');
	}

	public get urlHttp() {
		return this._settings.url
			.replaceAll('ws://', 'http://')
			.replaceAll('wss://', 'https://');
	}

	public get roomId() {
		return this._settings.roomId;
	}

	public get channel() {
		return this._settings.channel;
	}

	public get intercom() {
		return this._settings.intercom;
	}

	public get offair() {
		return this._settings.offair;
	}

	public get aec() {
		return this._settings.aec;
	}

	public get dialogOpen() {
		return this._store.dialogOpen;
	}

	public setDialogOpen(open: boolean) {
		this._store.dialogOpen = open;
	}

	public applySettings(
		url: string,
		roomId: number,
		channel: number,
		intercom: boolean,
		offair: boolean,
		aec: boolean,
	) {
		batch(() => {
			this._settings.url = url;
			this._settings.roomId = roomId;
			this._settings.channel = channel;
			this._settings.intercom = intercom;
			this._settings.offair = offair;
			this._settings.aec = aec;
		});
		//
		this._presister.save({ ...this._settings }).catch(console.error);
	}
}
