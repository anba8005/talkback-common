import { store } from '@risingstack/react-easy-state';

const OFFLINE_NOTIFICATION: Notification = {
	message: 'OFFLINE',
	persistent: true,
	type: 'error',
	key: 'offlineNotification',
};

interface NotificationAction {
	text: string;
	handler: () => any;
}

export type NotificationType =
	| 'default'
	| 'success'
	| 'warning'
	| 'error'
	| 'info';

export interface Notification {
	message: string;
	type?: NotificationType;
	persistent?: boolean;
	key?: string;
	action?: NotificationAction;
	timeout?: number;
}

interface Store {
	current: Notification | null;
}

export class NotificationStore {
	private _store: Store = store({
		current: null,
	});

	get current() {
		return this._store.current;
	}

	public show(notification: Notification) {
		if (notification.persistent === undefined) {
			notification.persistent = false;
		}
		if (!notification.type) {
			notification.type = 'default';
		}
		if (!notification.key) {
			notification.key = String(new Date().getTime() + Math.random());
		}
		this._store.current = notification;
	}

	public hide(key: string) {
		const current = this._store.current;
		if (current && key === current.key) {
			this._store.current = null;
		}
	}

	//
	//
	//

	public updateOnline(online: boolean) {
		if (online) {
			this.hide(OFFLINE_NOTIFICATION.key!);
		} else {
			this.show(OFFLINE_NOTIFICATION);
		}
	}
}
