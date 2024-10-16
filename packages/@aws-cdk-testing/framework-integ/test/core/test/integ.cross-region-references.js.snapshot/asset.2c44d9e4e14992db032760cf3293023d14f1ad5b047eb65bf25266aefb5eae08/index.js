"use strict";var p=Object.defineProperty;var _=Object.getOwnPropertyDescriptor;var b=Object.getOwnPropertyNames;var C=Object.prototype.hasOwnProperty;var g=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports),T=(r,e)=>{for(var t in e)p(r,t,{get:e[t],enumerable:!0})},v=(r,e,t,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of b(e))!C.call(r,s)&&s!==t&&p(r,s,{get:()=>e[s],enumerable:!(o=_(e,s))||o.enumerable});return r};var q=r=>v(p({},"__esModule",{value:!0}),r);var f=g((j,h)=>{"use strict";var l=class{constructor(e){this.value=e,this.next=void 0}},d=class{constructor(){this.clear()}enqueue(e){let t=new l(e);this._head?(this._tail.next=t,this._tail=t):(this._head=t,this._tail=t),this._size++}dequeue(){let e=this._head;if(e)return this._head=this._head.next,this._size--,e.value}clear(){this._head=void 0,this._tail=void 0,this._size=0}get size(){return this._size}*[Symbol.iterator](){let e=this._head;for(;e;)yield e.value,e=e.next}};h.exports=d});var R=g(($,y)=>{"use strict";var k=f(),z=r=>{if(!((Number.isInteger(r)||r===1/0)&&r>0))throw new TypeError("Expected `concurrency` to be a number from 1 and up");let e=new k,t=0,o=()=>{t--,e.size>0&&e.dequeue()()},s=async(n,c,...a)=>{t++;let m=(async()=>n(...a))();c(m);try{await m}catch{}o()},i=(n,c,...a)=>{e.enqueue(s.bind(null,n,c,...a)),(async()=>(await Promise.resolve(),t<r&&e.size>0&&e.dequeue()()))()},u=(n,...c)=>new Promise(a=>{i(n,a,...c)});return Object.defineProperties(u,{activeCount:{get:()=>t},pendingCount:{get:()=>e.size},clearQueue:{value:()=>{e.clear()}}}),u};y.exports=z});var I={};T(I,{handler:()=>M});module.exports=q(I);var E=require("@aws-sdk/client-ssm"),S=R();async function M(r){let e=r.ResourceProperties.ReaderProps,t=e.imports,o=Object.keys(t),s=`aws-cdk:strong-ref:${e.prefix}`,i=new E.SSM({region:e.region});try{switch(r.RequestType){case"Create":console.info("Tagging SSM Parameter imports"),await w(i,o,s);break;case"Update":let n=r.OldResourceProperties.ReaderProps.imports,c=P(o,Object.keys(n)),a=P(Object.keys(n),o);console.info("Releasing unused SSM Parameter imports"),Object.keys(a).length>0&&await x(i,a,s),console.info("Tagging new SSM Parameter imports"),await w(i,c,s);break;case"Delete":console.info("Releasing all SSM Parameter exports by removing tags"),await x(i,o,s);return}}catch(u){throw console.error("Error importing cross region stack exports: ",u),u}return{Data:t}}async function w(r,e,t){let o=S(10);await Promise.all(e.map(s=>o(async()=>{try{return await r.addTagsToResource({ResourceId:s,ResourceType:"Parameter",Tags:[{Key:t,Value:"true"}]})}catch(i){throw new Error(`Error importing ${s}: ${i}`)}})))}async function x(r,e,t){let o=S(10);await Promise.all(e.map(s=>o(async()=>{try{return await r.removeTagsFromResource({TagKeys:[t],ResourceType:"Parameter",ResourceId:s})}catch(i){if(i.name==="InvalidResourceId")return;throw new Error(`Error releasing import ${s}: ${i}`)}})))}function P(r,e){return r.filter(t=>!e.includes(t))}0&&(module.exports={handler});
