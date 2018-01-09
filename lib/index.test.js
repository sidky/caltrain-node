const sinon = require('sinon');
const util = require('util');
const caltrain_api = require('./index.js');

test('Validate outgoing api call', () => {

    var server = sinon.fakeServer.create();
    server.autoRespond = true;
    server.respondWith('GET', 'http://api.511.org/transit/lines', [
        500,
        { 'Content-Type': 'text/plain' },
        'Shit is dope'
    ]);
    var caltrain = caltrain_api.create('MOCK_API_KEY');

    const lines = await caltrain.lines();

    console.log(util.inspect(lines));
});