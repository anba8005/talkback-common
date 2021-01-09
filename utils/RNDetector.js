const reactNative =
	typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

function isReactNative() {
	return reactNative;
}

export default { isReactNative };
