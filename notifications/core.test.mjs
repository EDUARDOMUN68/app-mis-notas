import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validSubscription,validPayload,reconcile,nextAlarm} from './core.mjs';
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-test',keys:{p256dh:'A'.repeat(87),auth:'A'.repeat(22)}};
test('Rechaza endpoints arbitrarios y entradas rotas',()=>{assert.equal(validSubscription(sub),true);for(const endpoint of ['http://127.0.0.1','https://example.com/push','https://fcm.googleapis.com.evil.test','https://fcm.googleapis.com:444/send'])assert.equal(validSubscription({...sub,endpoint}),false);assert.equal(validPayload({subscription:sub,revision:1,tasks:[null]}),false);assert.equal(validPayload({subscription:sub,revision:1,tasks:[{id:'a',at:Date.now()+60000}]}),true);});
test('Reprogramar cambia alarma, repetir sincronización no reenvía, eliminar cancela',()=>{const old=[{id:'a',at:100,sent:true,attempts:0},{id:'b',at:200,sent:false,attempts:1,retryAt:300}];assert.equal(nextAlarm(reconcile(old,[{id:'a',at:100}])),null);assert.equal(nextAlarm(reconcile(old,[{id:'a',at:500}])),500);assert.equal(nextAlarm(reconcile(old,[{id:'b',at:200}])),300);assert.equal(nextAlarm(reconcile(old,[])),null);});
