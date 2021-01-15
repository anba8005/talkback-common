export class Countdown {
	private _count: number;

	private _timer: any;

	private _period = 1000;

	constructor(
		start: number,
		private onCount: (count: number) => void,
		private onComplete: () => void,
		period?: number,
	) {
		this._count = start;
		if (period) {
			this._period = period;
		}
	}

	public start() {
		this.onCount(this._count);
		this._timer = setInterval(() => {
			this._count--;
			if (this._count > 0) {
				this.onCount(this._count);
			} else {
				clearInterval(this._timer);
				this.onComplete();
			}
		}, this._period);
	}

	public cancel() {
		if (this._timer) {
			clearInterval(this._timer);
		}
	}
}
