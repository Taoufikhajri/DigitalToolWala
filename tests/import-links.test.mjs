import test from 'node:test';import assert from 'node:assert/strict';
import {extractActivationToken} from '../lib/import-links.js';import {parseLinks} from '../lib/links.ts';
test('any HTTP(S) domain can supply a token in a path, query, fragment or nested encoded URL',()=>{
 const t='AQCpiIexample_valid==';const link='https://new-domain.example/offer/'+t;
 for(const input of [t,link,'http://new-domain.example/offer/'+t,link+'?tracking=5','https://new-domain.example/?code='+encodeURIComponent(t),'https://new-domain.example/#'+t,'https://new-domain.example/#/offer/'+t,'https://new-domain.example/#token='+encodeURIComponent(t),'https://new-domain.example/?url='+encodeURIComponent(link),'https://new-domain.example/?url='+encodeURIComponent(encodeURIComponent(link)),'<'+link+'>','[Offer]('+link+')'])assert.equal(extractActivationToken(input),t,input);
 const rows=parseLinks(link+'\nhttps://another.example/?token='+encodeURIComponent(t)+'\n'+t);assert.equal(rows.rows.length,1);assert.equal(rows.duplicates,2);
});
test('no hidden destination is fetched and ambiguous or invalid input is rejected',()=>{
 for(const input of ['https://short.example/opaque-code','https://example.test/', 'https://AQCpiIhostname.example/','javascript:alert(1)','data:text/plain,AQCpiItest==','https://user:AQCpiIpassword==@example.test/','https://example.test/?token=AQCpiIone==&other=AQCpiItwo==','https://example.test/AQCpiIwrong%2Btoken==','https://example.test/'+ 'AQCpiI'+'a'.repeat(4100)])assert.equal(extractActivationToken(input),null,input);
 assert.equal(extractActivationToken('https://example.test/AQCpiIsame==?token=AQCpiIsame=='),'AQCpiIsame==');
});
