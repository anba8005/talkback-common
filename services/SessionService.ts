import {
	ISimpleEventHandler,
	SimpleEventDispatcher,
} from 'strongly-typed-events';
import Janus, { Client, Connection, Session } from '../utils/Janus';

export interface TimeoutHandler {
	setTimeout: (handler: () => void, timeout: number) => any;
	clearTimeout: (timeoutId: any) => void;
}

export class SessionService {
	private _sessionEvent = new SimpleEventDispatcher<Session | null>();
	private _failedEvent = new SimpleEventDispatcher<void>();

	private _janus?: Client;
	private _connection?: Connection;
	private _session?: Session;

	constructor(private _timeoutHandler: TimeoutHandler) {}

	public async connect(url: string) {
		this._janus = new Janus.Client(url, {
			keepalive: 'true',
			setTimeout: this._timeoutHandler.setTimeout,
			clearTimeout: this._timeoutHandler.clearTimeout,
			pc: {
				config: {
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{
							urls: 'turn:turn.b3video.lt:3478?transport=udp',
							credential: 'turn',
							username: 'turn',
						},
					],
				},
			},
		}) as Client;
		this._connection = await this._janus.createConnection();
		this._connection.on('close', () => this._failedEvent.dispatch());
		this._connection.on('error', () => this._failedEvent.dispatch());
		this._session = await this._connection.createSession();
		this._sessionEvent.dispatch(this._session);
	}

	public async disconnect() {
		if (this._connection) {
			this._sessionEvent.dispatch(null);
			//
			const connection = this._connection;
			connection.removeAllListeners('close');
			connection.removeAllListeners('error');
			//
			this._session = undefined;
			this._connection = undefined;
			this._sessionEvent.dispatch(null);
			//
			await connection.close();
		}
	}

	public onSession(handler: ISimpleEventHandler<Session | null>) {
		this._sessionEvent.asEvent().subscribe(handler);
	}

	public onFailed(handler: ISimpleEventHandler<void>) {
		this._failedEvent.asEvent().subscribe(handler);
	}

	public get timeoutHandler() {
		return this._timeoutHandler;
	}
}
