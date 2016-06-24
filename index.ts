type Resolve<T> = (value?: T) => void;
type Reject = (reason?: any) => void;
type Handler<T> = (resolve: Resolve<T>, reject?: Reject) => T;
type Then<T> = (value: T) => any;
type ThenHandler = { handler: (value: any) => any, promise: CustomPromise<any> }

const symbol = Symbol('CustomPromise');
let count = 0;

export default class CustomPromise<T> {
    constructor(handler: (resolve: Resolve<T>, reject?: Reject) => any) {
        if (typeof handler !== 'function') {
            throw new Error(`Promise resolver is ${typeof handler}, but must be a function`);
        }
        this.handler = handler;
        try {
            handler(this._resolve, this._reject);
        } catch (ex) {
            this._reject(ex);
        }
    }

    handler: Handler<T>;
    identifer = ++count;
    fulfillHandlers: Array<(value: T) => any> = [];
    rejectHandlers: Array<(value: any) => any> = [];
    value: T;


    private state: State = State.Pending;

    static resolve = <T>(value?: T) => {
        const promise = new CustomPromise<T>(resolve => resolve(value));
        return promise;
    }

    static reject = (value?: any) => {
        const promise = new CustomPromise<any>((resolve, reject) => reject(value));
        return promise;
    }

    static defer = () => {
        var resolve;
        var reject;
        const promise = new CustomPromise<any>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, reject, resolve }
    }

    then = (onFulfilled?: Then<T>, onRejected?: Reject) => {

        let resolve;
        let reject;
        const promise = new CustomPromise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const tryHandle = (fn: (arg: any) => any, arg: any, handler: any) => {
            try {
                if (isFunction(fn)) {
                    const result = fn(arg);
                    if (result === promise) {
                        reject(new TypeError('Unable to fulfill or reject a promise with itself'));
                        return;
                    }
                    resolve(result);
                }
                else {
                    handler(arg);
                }
            }
            catch (ex) {
                reject(ex);
            }
        }

        const resolveHandler = (value: T) => {
            tryHandle(onFulfilled, value, resolve);
        }
        if (this.state === State.Fulfilled) {
            process.nextTick(() => resolveHandler(this.value));
        }
        else {
            this.fulfillHandlers.push(resolveHandler);
        }

        const rejectHandler = (value: any) => {
            tryHandle(onRejected, value, reject);
        }
        if (this.state === State.Rejected) {
            process.nextTick(() => rejectHandler(this.value));
        }
        else {
            this.rejectHandlers.push(rejectHandler);
        }

        return promise;
    }

    private isPending = () => this.state === State.Pending;

    private _resolve = (value: T) => {
        if (!this.isPending()) return;

        try {
            const ref = (value || {})['then'];
            const isThenable = typeof ref === 'function';
            const isObjectOrFunction = value instanceof Object || value instanceof Function;

            if (isThenable) {            
                ref.call(value, this._resolve, this._reject);
                return;
            }
        }
        catch (ex) {
            this._reject(ex);
            return;
        }

        const runner = () => {
            this.state = State.Fulfilled;
            this.value = value;
            this.fulfillHandlers.forEach(handler => {
                try {
                    handler(value);
                } catch (ex) {
                    this.value = ex;
                    this.state = State.Rejected;
                    this._reject(ex);
                }
            });
        };

        process.nextTick(() => runner());
    }

    private _reject = (value: any) => {
        if (!this.isPending()) return;

        const runner = () => {
            this.state = State.Rejected;
            this.value = value;

            this.rejectHandlers.forEach(handler => {
                try {
                    handler(value);
                }
                catch (ex) {
                    // NOOP
                }
            });
        };

        process.nextTick(() => runner());
    }


}

enum State {
    Pending,
    PendingAnotherPromise,
    Fulfilled,
    Rejected
}

function isPromise(value): value is CustomPromise<any> {
    return typeof value.then === 'function';
}

function isFunction(value): value is Function {
    return typeof value === 'function';
}
