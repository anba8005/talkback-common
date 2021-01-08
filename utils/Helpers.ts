export function isNumber(value: any) {
	return !isNaN(Number(value));
}

export function isPositiveNumber(value: any) {
	const num = Number(value);
	return !isNaN(num) && num > 0;
}

export function isPositiveOrZeroNumber(value: any) {
	const num = Number(value);
	return !isNaN(num) && num >= 0;
}

export function getRandomIntInclusive(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

export function isCustomServer(server: string) {
	const url = new URL(server);
	return url.port !== '443' && url.port !== '';
}
