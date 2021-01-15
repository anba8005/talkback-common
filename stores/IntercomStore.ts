import { createIntercomGroup, IntercomGroup } from './IntercomGroup';
import { SessionService } from '../services/SessionService';
import { createAudioBridgeService } from '../services/AudioBridgeService';
import { store } from '@risingstack/react-easy-state';

export const MAX_NUM_GROUPS = 8;

export class IntercomStore {
	private _groupMap: Map<number, IntercomGroup> = new Map<
		number,
		IntercomGroup
	>();

	private _groups: IntercomGroup[] = [];

	private _limitedGroups: IntercomGroup[] = [];

	private _store = store({
		activeGroupId: 0,
		numGroups: MAX_NUM_GROUPS,
	});

	constructor(sessionService: SessionService) {
		for (let i = 1; i <= MAX_NUM_GROUPS; i++) {
			const service = createAudioBridgeService(sessionService, i, false);
			const group = createIntercomGroup(service);
			this._groupMap.set(i, group);
		}
		this._groups = Array.from(this._groupMap.values());
	}

	public get activeGroup() {
		return this._groupMap.get(this._store.activeGroupId);
	}

	public get groups() {
		return this._groups;
	}

	public get limitedGroups() {
		if (this._limitedGroups.length !== this._store.numGroups) {
			this._limitedGroups = [];
			for (let i = 1; i <= this._store.numGroups; i++) {
				const group = this._groupMap.get(i);
				if (group) {
					this._limitedGroups.push(group);
				}
			}
		}
		return this._limitedGroups;
	}

	public get anyConnected() {
		for (const group of this.limitedGroups) {
			if (group.connected) {
				return true;
			}
		}
		return false;
	}

	public get anyFailed() {
		for (const group of this.limitedGroups) {
			if (group.failed) {
				return true;
			}
		}
		return false;
	}

	public setNumGroups(numGroups: number) {
		this._store.numGroups = numGroups;
	}

	public activateAndStartGroupById(groupId: number) {
		this._store.activeGroupId = groupId;
		this.activeGroup?.start();
	}
}
