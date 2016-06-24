import P from './index';
import * as assert from 'assert';

const value = { foo: 'bar' };

var p1 = P.resolve();
console.log(p1 instanceof P);
console.log(p1 instanceof Object);
console.log(p1 instanceof Function);