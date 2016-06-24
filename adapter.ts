import CustomPromise from './index';

export let resolved = CustomPromise.resolve;
export let rejected = CustomPromise.reject;
export let deferred = CustomPromise.defer;