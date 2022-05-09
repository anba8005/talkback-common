import {
	ISimpleEventHandler,
	SimpleEventDispatcher,
} from 'strongly-typed-events';
import { Plugin, Session } from '../utils/Janus';
import { SessionService } from './SessionService';

export abstract class AbstractJanusService<T extends Plugin> {
	private _errorEvent = new SimpleEventDispatcher<Error | null>();

	private _plugin?: T;

	private _roomId?: number;

	private _session: Session | null = null;

	private _autoStart = true;

	constructor(sessionService: SessionService, private _name: string) {
		sessionService.onSession((session) => {
			console.debug('got session ' + this._name + ' ' + String(!!session));
			this._session = session;
			if (session) {
				this.start().catch(console.error);
			} else {
				this.stop();
			}
		});
	}

	public setAutoStart(autoStart: boolean) {
		this._autoStart = autoStart;
	}

	public start() {
		if (this._session) {
			return this._createPlugin(this._session).catch(console.error);
		} else {
			return Promise.resolve();
		}
	}

	public stop() {
		if (this._plugin) {
			this._destroyPlugin();
		}
	}

	//

	protected get errorEvent() {
		return this._errorEvent;
	}

	protected get plugin() {
		return this._plugin;
	}

	public get roomId() {
		return this._roomId;
	}

	public setRoomId(id: number) {
		this._roomId = id;
	}

	public onError(handler: ISimpleEventHandler<Error | null>) {
		return this._errorEvent.asEvent().subscribe(handler);
	}

	protected abstract afterCreatePlugin(): Promise<void>;

	protected abstract beforeDestroyPlugin(): void;

	private async _createPlugin(session: Session) {
		if (!this._autoStart) return;
		console.debug('starting ' + this._name);
		try {
			this._plugin = await session.attachPlugin<T>(this._name);
			this._plugin.on('error', (e) => {
				this._errorEvent.dispatch(e);
			});
		} catch (e: any) {
			this._errorEvent.dispatch(e);
		}
		await this.afterCreatePlugin();
	}

	private _destroyPlugin() {
		this.beforeDestroyPlugin();
		this._plugin?.detach();
		this._plugin = undefined;
		this._errorEvent.dispatch(null);
	}
}
