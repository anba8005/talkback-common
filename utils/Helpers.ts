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

export function isNumberInRange(value: any, min: number, max: number) {
	const num = Number(value);
	return !isNaN(num) && num >= min && num <= max;
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

export function hexToRGB(hex: string, alpha: string) {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	if (alpha) {
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	} else {
		return `rgb(${r}, ${g}, ${b})`;
	}
}
